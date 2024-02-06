import { myReducer, Qili as QiliApi, isAdmin} from "react-native-use-qili/store";
import { createApi } from "@reduxjs/toolkit/query/react";
import { XMLParser } from 'fast-xml-parser';
import * as FileSystem from "expo-file-system";
import { produce } from "immer";
import cheerio from "cheerio";

import ytdl from "react-native-ytdl";
import { YoutubeTranscript } from "./experiment/youtube-transcript";
import * as Calendar from "./experiment/calendar";
import mpegKit from "./experiment/mpeg";


export const Policy={
	general: {
		desc: "options to control player and reaction",
		record: false,//record my audio
		visible: true,//show video or not
		caption: true,//show caption or not
		captionDelay: 0,//caption delay time
		autoChallenge:60,//add chunk into challenges if the percentage of identified text matching the original chunk text is lower than the value
		speed: 1,
		whitespace: 0, //whitespace time to start next,0:no whitespace
		chunk: 0, //0:chunck by chunck, n: chunks totally n seconds, 7: paragraph, 10: whole
		fullscreen: false,//
		autoHide: true,//hide action bar or not
	},
	shadowing: {
		desc: "options when shadowing chunk by chunk",
		record: true,
		whitespace: 1,
		chunk: 0,
	},
	dictating: {
		desc: "options when shadowing chunks by chunks",
		record: true,
		captionDelay: 1,
		whitespace: 1,
		chunk: 1, //1s
	},
	retelling: {
		desc: "options when shadowing paragraph by paragraph",
		record: true,
		captionDelay: 1,
		whitespace: 1,
		chunk: 7, //paragraph
	},
}

const TedHeader={
	"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 11_6_8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36",
}

async function fetchTedTalk({slug},{lang, mylang}){
	const res=await fetch("https://www.ted.com/graphql",{
		method:"POST",
		headers:{
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		body:JSON.stringify({
			query: `query {
			translation(
				videoId: "${slug}"
				language: "${lang}"
			) {
				paragraphs {
					cues {
						text
						time
					}
				}
			}
				
			video(slug:"${slug}"){
					description
					playerData
				}
			}`,
		}),
	})
	const {data}=await res.json()
		
	const {translation, video: { playerData, description },}=data
	const {id, resources, title, thumb, languages, duration, speaker, targeting:{tag=""}={}}=JSON.parse(playerData)
	const talk={
		id, slug, title, thumb, languages, duration,description,speaker,source:"ted",tags:tag.split(","),
		video: resources.hls.stream,
	}
	
	talk.languages=talk.languages.reduce((langs,a)=>(langs[a.languageCode]=a,langs),{})
	
	if(!translation)
		return talk

	const {paragraphs}=translation
	talk.languages.mine={transcript:paragraphs}
	
	console.assert(resources.hls.metadata)
	const resHlsMeta=await fetch(resources.hls.metadata)
	const hlsMeta=await resHlsMeta.json()
	const offset=hlsMeta.domains.filter(a=>!a.primaryDomain).reduce((sum,a)=>sum+a.duration*1000,0)
	const target=hlsMeta.subtitles.find(a=>a.code.toLowerCase()==mylang)
	
	const nextCue=((vtt,last=0)=>()=>{
		if(!vtt)
			return
		const i0=vtt.indexOf("\n\n",last)
		if(i0==-1)//The last may not have data
			return 
		const i=vtt.indexOf("\n",i0+2)
		try{
			return vtt.substring(i+1, vtt.indexOf("\n", i+1))
		}finally{
			last=i+1
		}
	})(target && await (await fetch(target.webvtt)).text());

	(lastCue=>paragraphs.forEach(p=>p.cues.forEach(cue=>{
		cue.time+=offset
		cue.end=talk.duration*1000+offset
		if(lastCue){
			lastCue.end=cue.time-200
		}
		cue.my=nextCue()
		lastCue=cue
	})))();
	return talk
}

const widgetTalks_queryFn=async (variables,api)=>{
	const data=await Qili.fetch({
		id:"widgetTalks",
		variables:{...variables, lang: api.getState().my.lang}
	})
	data.talks.reverse()
	return {data}
}

export const Ted=Object.assign(createApi({
	reducerPath:"ted",
	endpoints:builder=>({
		talk:builder.query({
			queryFn: async ({slug,id},api)=>{
				const state=api.getState()

				const talk=await (async ()=>{
					const Widget=globalThis.Widgets[slug]

					const {lang="en", mylang="zh-cn"}=state.my

					if(slug=="youtube"){
						debugger
						/*
						if(state.talks[id]){
							return {id,slug:"youtube"}
						}
						*/

						const info=await ytdl.getInfo(`https://www.youtube.com/watch?v=${id}`)
						const format=(formats=>{
							/*
							const audios=formats.filter(a=>a.hasAudio && !a.hasVideo && a.container=="mp4" && a.contentLength)
							if(audios.length){
								const i=audios.reduce((k,a,I)=>{
									return parseInt(a.contentLength)<parseInt(audios[k].contentLength) ? I : k
								},0)
								return audios[i]
							}
							*/
							return ytdl.chooseFormat(formats,{
								filter:a=>a.hasAudio && a.container=="mp4",
								quality:"lowestvideo",
							})
						})(info.formats);

						const {title, keywords:tags, lengthSeconds, thumbnails:[{url:thumb}], author:{name:author},} = info.videoDetails
						
						const talk={
							title, id, slug:`youtube`, source:"youtube", thumb,tags,author,
							video: format.url,
							duration:parseInt(lengthSeconds)*1000,
						}

						api.dispatch({type:"talk/set",talk})
						
						const file=talk.localVideo=`${FileSystem.documentDirectory}${id}/video.mp4`
						mpegKit.generateAudio({source:format.url, target:file})
							.then(()=>{
								//api.dispatch({type:"talk/set",talk:{id, localVideo:file}})
							})
							.catch(e=>{
								console.error(e)
								api.dispatch({type:"talk/clear",id})
							})
							
						const transcripts=await YoutubeTranscript.fetchTranscript(id,{lang})
						const myTranscripts=await YoutubeTranscript.fetchTranscript(id,{lang:mylang})
						if(myTranscripts && transcripts.length==myTranscripts.length){
							transcripts.forEach((cue,i)=>cue.my=myTranscripts[i].text)
						}
						if(transcripts){
							transcripts.forEach(cue=>{
								cue.time=cue.offset
								delete cue.offset
								cue.end=cue.time+cue.duration
								delete cue.duration
							})
						}
						talk.languages={mine:{transcript:[{cues:transcripts}]}}
						api.dispatch({type:"talk/set",talk})

						return {id, slug:"youtube"}
					}else if(Widget){
						if(id && !state.talks[id]){
							const {talk}=await Qili.fetch({
								id:"talk",
								variables:{
									slug:"Widget", 
									id
								}
							})
							return talk
						}
					}else{
						return await fetchTedTalk({slug},{lang, mylang})
					}
				})();

				//talk && api.dispatch({type:"talk/set", talk})
				return {data:talk}
			},
		}),
		talks:builder.query({
			queryFn:async ({q, page}, api)=>{
				const {lang}=api.getState().my
				let minutes=0
				q=q.replace(/((\d+)\s*minutes)/ig, (full, $1, $2)=>(minutes=parseInt($2),"")).trim()

				const query=[
					minutes>0 && `duration=${(Math.ceil(minutes/6)-1)*6}-${Math.ceil(minutes/6)*6}`,
					!!q ? "sort=relevance" : "sort=newest",
					!!q && `q=${encodeURI(q)}`,
					page>1 && `page=${page}`
				].filter(a=>!!a).join("&")

				const res=await fetch(`https://www.ted.com/talks${!!query ? `?${query}` :""}`,TedHeader)
				const data=await res.text()
				const $=cheerio.load(data)
				const talks=$("#browse-results .media").map((i,el)=>{
					const $el=$(el)
					const link=$el.find("a.ga-link").last()
					return {
						title:link.text(),
						slug:link.attr("href").split("/").pop(),
						thumb:$el.find('img').attr('src'),
						duration:(([m,s])=>parseInt(m)*60+parseInt(s))($el.find('.thumb__duration').text().split(":"))
					}
				}).toArray()
				const pages=parseInt($("#browse-results>.results__pagination .pagination__item").last().text())||1
				return {data:{talks,page,pages}}
			},
		}),

		people:builder.query({
			queryFn:async ({q}, api)=>{
				const res=await fetch(`https://www.ted.com/search?cat=people&q=${encodeURI(q)}`,TedHeader)
				const data=await res.text()
				
				const $=cheerio.load(data)
				const talks=$(".search-results .search__result").map((i,el)=>{
					const $el=$(el)
					const link=$el.find("h3>a.ga-link").first()
					return {
						name:link.text().split("|")[0].trim(),
						slug:link.attr("href").split("/").pop(),
						thumb:$el.find('img').attr('src'),
						desc:$el.find('.search__result__description').text(),
					}
				}).toArray()
				return {data:talks}
			}
		}),
		speakerTalks:builder.query({
			queryFn:async ({q},api)=>{
				const res=await fetch(`https://www.ted.com/speakers/${q}`,TedHeader)
				const data=await res.text()
				const $=cheerio.load(data)
				const talks=$("#talks .media").map((i,el)=>{
					const $el=$(el)
					const link=$el.find("a.ga-link").last()
					return {
						title:link.text(),
						slug:link.attr("href").split("/").pop(),
						thumb:$el.find('img').attr('src'),
						duration:(([m,s])=>parseInt(m)*60+parseInt(s))($el.find('.thumb__duration').text().split(":"))
					}
				}).toArray()
				return {data:{talks}}
			}
		}),
		today:builder.query({
			queryFn:async (day,api)=>{
				const res=await fetch("http://feeds.feedburner.com/TEDTalks_audio",{
					headers:{
						"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 11_6_8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36",
					},
				})
				const data=await res.text()
				const {rss}=new XMLParser({
					ignoreAttributes:false,
					attributeNamePrefix:"",
					removeNSPrefix:true,
					textNodeName:"value",
				}).parse(data);
				const slug=(link, i=link.lastIndexOf("/"),j=link.indexOf("?"))=>link.substring(i+1,j)
				const toSec=dur=>{
					const [h,m,s]=dur.split(":").map(a=>parseInt(a))
					return (h*60+m)*60+s
				}
				const talks=rss?.channel.item.map(({title,talkId:id, duration,thumbnail, link})=>{
					return {id, title, duration:toSec(duration), thumb:thumbnail.url,slug:slug(link)}
				}).filter(a=>!!a.duration)
				return {data:{talks}}
			},
		}),
		widgetTalks:builder.query({
			queryFn:widgetTalks_queryFn,
			serializeQueryArgs({queryArgs},b){
				debugger
				return queryArgs
			}
		})
	})
}),{
	testNetwork(state){
		const {lang="en", mylang="zh-cn"}=state.my
		return Promise.all([
			fetchTedTalk({slug:`noah_raford_how_gaming_can_be_a_force_for_good`},{lang,mylang})
				.then(talk=>!!talk.languages),
			fetch(`https://www.ted.com/talks`).then(res=>res.text())
		])
	},
	supportLocal(talk){
		return talk.video && talk.video.startsWith("http")
	}
})

export const Qili=Object.assign(createApi({
	reducerPath:"qili",
	tagTypes:["Talk","User"],
	endpoints:builder=>({
		talk:builder.query({
			queryFn:async ({slug,id},api)=>{
				const {talk}=await Qili.fetch({
					id:"talk",
					variables:{slug, id}
				})
				return {data:talk||{id}}
			},
			providesTags: talk=>{
				return [{type:"Talk",id:talk.id}]
			}
		}),
		talks:builder.query({
			queryFn:async ({q="", page}, api)=>{
				const {lang}=api.getState().my
				let minutes=0
				q=q.replace(/((\d+)\s*minutes)/ig, (full, $1, $2)=>(minutes=parseInt($2),"")).trim()
				
				const data=await Qili.fetch({
					id:"talks",
					variables:{q, lang}
				})
				data.talks.reverse()
				return {data}
			},
			providesTags:()=>['Talk']
		}),
		people:builder.query({
			queryFn:async ({q}, api)=>{
				const {people}=await Qili.fetch({
					id:"people",
					variables:{q}
				})
				return {data:people}
			}
		}),
		speakerTalks:builder.query({
			queryFn:async ({q},api)=>{
				const data=await Qili.fetch({
					id:"speakerTalks",
					variables:{q}
				})
				data.talks.reverse()
				return {data}
			},
			providesTags:()=>['Talk']
		}),
		today:builder.query({
			queryFn:async (day,api)=>{
				const data=await Qili.fetch({
					id:"today"
				})
				data.talks.reverse()
				return {data}
			},
			providesTags:()=>[{type:"Talk", id:"today"}]
		}),
		widgetTalks:builder.query({
			queryFn:widgetTalks_queryFn
		})
	})
}),{
	...QiliApi,
	isUploaded(video) {
		return video.indexOf("qili2.com") != -1;
	},
})

const Services={Ted, Qili, current:'Ted'}
export const TalkApi=new Proxy(Services,{
	get(target, key){
		return target[target.current][key]
	}
})

export const reducers=(()=>{
	function nullClear(o, key, returnEmpty){
		o={...o}
		delete o[key]
		if(returnEmpty)
			return o
		return Object.keys(o).length==0 ? null : o
	}

	function immutableSet(o, keys, value, returnEmpty=true){
		if(keys.length==1){
			return value===null ? nullClear(o,keys[0], returnEmpty) : {...o, [keys[0]]:value}
		}
		const first=keys.shift()
		const firstValue=immutableSet({...o[first]}, keys ,value, false)
		return firstValue===null ? nullClear(o, first, returnEmpty) : {...o, [first]: firstValue}
	}

	function checkAction(action,keys){
		const missing=keys.filter(a=>!(a in action))
		if(missing.length>0){
			throw new Error(`action[${action.type}] miss keys[${missing.join(",")}]`)
		}
		return true
	}

	return {
		[Ted.reducerPath](state, action){
			switch(action.type){
				case "lang/PERSIST":
					return {}
				case "persist/REHYDRATE":
					return {...Ted.reducer(...arguments), config:state.config}
			}
			return Ted.reducer(...arguments)
		},
		[Qili.reducerPath](state,action){
			switch(action.type){
				case "lang/PERSIST":
					return {}
				case "persist/REHYDRATE":
					return {...Qili.reducer(...arguments), config:state.config}
			}
			return Qili.reducer(...arguments)
		},
		my(state = {
			...myReducer(undefined, {}),
			policy:Policy, 
			lang:"en",mylang: "zh-cn", tts:{}, 
		}, action) {
			switch (action.type) {
				case "lang/PERSIST":
					const {lang, tts}=state
					const data={lang}
					if(tts?.[lang]){
						data.tts={[lang]:tts[lang]}
					}
					return data
				case "lang/REHYDRATE":
					return produce(state,$state=>{
						const {lang, tts}=action.payload.my
						$state.lang=lang
						if(tts?.[lang]){
							$state.tts[lang]=tts[lang]
						}
					})
				case "persist/REHYDRATE":
					if(!!!action.payload?.my)
						return state
					const {my={}}=action.payload
					Object.keys(state).forEach(k=>{
						if(!(k in my)){
							my[k]=state[k]
						}
					})
					Object.keys(state.policy).forEach(k=>{
						my.policy[k]={...state.policy[k],...my.policy[k]}
					})

					if(my.api){
						Services.current=my.api
					}

					my.i++
					return state
				case "policy":
					return produce(state, $state=>{
						checkAction(action,["target","payload"])
						Object.assign($state.policy[action.target], action.payload)
					})
				case "my/lang":
					return {...state, lang:action.lang}
				case "my/tts":
					return {...state, tts:{...state.tts, ...action.payload}}
				case "my/api":
					return {...state, api:(Services.current=action.api)}
			}
			return myReducer(state,action)
		},
		message(state=[],action){
			switch(action.type){
				case "message":
					return [...state, action.message]
				case "message/remove":
					return produce(state, $messages=>{
						action.messages.forEach(a=>{
							const i=$messages.indexOf(a)
							if(i!=-1){
								$messages.splice(i,1)
							}
						})
					}) 
			}
			return state
		},
		talks(talks={},action){
			const getTalk=(action, $talks)=>{
				checkAction(action, ["talk"])
				const {talk:{slug, id, ...$payload}, key,value, policy,payload=key ? {[key]:value} : $payload, ...others}=action
				const {talk:{title, thumb,duration,link,video, data, languages}}=action
				return {
					talk: $talks[id]||($talks[id]={slug, title, thumb,duration,link,id, video, data, languages}),
					payload, policy, ...others
				}
			}
			switch(action.type){
				case "lang/PERSIST":
					return talks
				case "lang/REHYDRATE":
					return action.payload.talks
				case "talk/set":
					return produce(talks, $talks=>{
						$talks[action.talk.id]={...$talks[action.talk.id],...action.talk}
					})
				case "talk/toggle/favorited":
					return produce(talks, $talks=>{
						const {talk}=getTalk(action, $talks)
						talk.favorited=!!!talk.favorited
					})
				case "talk/toggle/challenging":
					return produce(talks, $talks=>{
						checkAction(action, ["policy"])
						const {talk, policy}=getTalk(action, $talks)

						const hasChallenges=talk[policy]?.challenges?.length>0
						if(action.value==undefined){
							(talk[policy]||(talk[policy]={})).challenging=hasChallenges
						}else if(action.value===true && hasChallenges){
							(talk[policy]||(talk[policy]={})).challenging=true
						}
						if(talk[policy]){
							delete talk[policy].history
						}
					})
				case "talk/policy":
					return produce(talks, $talks=>{
						checkAction(action, ["payload","talk"])
						const {talk, payload, target="general",}=getTalk(action, $talks)
						if(talk[target]?.challenging){
							delete payload.chunk
						}
						talk[target]={...talk[target], ...payload}
					})
				case "talk/challenge/add":
					return produce(talks, $talks=>{
						checkAction(action, ["chunk","talk","policy"])
						const {talk, policy="general", chunk}=getTalk(action, $talks)
						
						const {challenges=[]}=talk[policy]||(talk[policy]={})
						talk[policy].challenges=challenges
						const i=challenges.findIndex(a=>a.time==chunk.time)
						if(i==-1){
							challenges.push(chunk)
						}
					})	
				case "talk/challenge/remove":
					return produce(talks, $talks=>{
						checkAction(action, ["chunk","talk","policy"])
						const {talk, policy="general", chunk}=getTalk(action, $talks)

						const {challenges=[]}=talk[policy]||(talk[policy]={})
						talk[policy].challenges=challenges
						const i=challenges.findIndex(a=>a.time==chunk.time)
						if(i!==-1){
							challenges.splice(i,1)
						}
						if(challenges.length==0){
							delete talk[policy].challenging
							delete talk[policy].records
							FileSystem.deleteAsync(`${FileSystem.documentDirectory}${talk.id}/${policy}`,{idempotent:true})
						}
					})
				case "talk/challenge/toggle":
					return produce(talks, $talks=>{
						checkAction(action, ["chunk","talk","policy"])
						const {talk, policy="general", chunk}=getTalk(action, $talks)
						
						const {challenges=[]}=talk[policy]||(talk[policy]={})
						talk[policy].challenges=challenges
						const i=challenges.findIndex(a=>a.time>=chunk.time)
						if(i==-1){
							challenges.push(chunk)
						}else if(challenges[i].time==chunk.time){
							challenges.splice(i,1)
						}else{
							challenges.splice(i,0,chunk)
						}
						if(challenges.length==0){
							delete talk[policy].challenging
							delete talk[policy].records
							FileSystem.deleteAsync(`${FileSystem.documentDirectory}${talk.id}/${policy}`,{idempotent:true})
						}
					})
				case "talk/recording":
					return produce(talks, $talks=>{
						checkAction(action, ["record","talk","policy"])
						const {talk, policy:policyName, record, score}=getTalk(action, $talks)

						const {records={}}=(talk[policyName]||(talk[policyName]={}));
						const time=Object.keys(record)[0];
						(talk[policyName].records=records)[time]=record[time]
						records.changed=Date.now()
					})
				////unify : id, uri
				case "talk/book/record":
					return produce(talks, $talks=>{
						const {type, id, talk:talk0, ...record}=action
						let talk=$talks[id]
						if(!talk && talk0){
							talk=$talks[id]={data:[], ...talk0}
						}

						talk.data.push(record)
					})
				case "talk/book/remove":
					return produce(talks, $talks=>{
						const {id, uri}=action
						const talk=$talks[id]
						const i=talk.data.findIndex(a=>a.uri==uri)
						if(i!=-1){
							talk.data.splice(i,1)
						}
					})
				case "talk/book/remove/index":
					return produce(talks, $talks=>{
						const {id, index:i}=action
						const talk=$talks[id]
						if(i!=-1){
							talk.data.splice(i,1)
						}
					})
				case "talk/book/add":
					return produce(talks, $talks=>{
						const {id, appending}=action
						if(appending.length>0){
							const talk=$talks[id]
							talk.data=[...talk.data, ...appending]
						}
					})
				case "talk/book/set":
					return produce(talks, $talks=>{
						const {id, uri, type, ...props}=action
						const talk=$talks[id]
						const item=talk.data.find(a=>a.uri==uri)
						if(item){
							Object.assign(item, props)
						}
					})
				case "talk/book/replace":
					return produce(talks, $talks=>{
						const {id, i, appending}=action
						if(appending.length>0){
							const talk=$talks[id]
							talk.data.splice(i,1,...appending)
						}
					})
				/////////
				case "talk/clear/history":
					return produce(talks, $talks=>{
						checkAction(action, ["id"])
						const talk=$talks[action.id]
						
						if(talk){ 
							const Widget=globalThis.Widgets[talk.slug]
							Object.keys(Policy).forEach(policy=>{
								FileSystem.deleteAsync(`${FileSystem.documentDirectory}${talk.id}/${policy}`,{idempotent:true})
								talk[policy]= Widget?.defaultProps[policy]
							})
						}
					})
				case "talk/clear":
					return produce(talks, $talks=>{
						const talk=$talks[action.id]
						if(talk){
							const clear=a=>{
								FileSystem.deleteAsync(`${FileSystem.documentDirectory}${a.id}`,{idempotent:true})
								delete $talks[a.id]
							}
							clear(talk)
							const Widget=globalThis.Widgets[talk.slug]
							
							if(Widget && talk.id==talk.slug){
								Object.values($talks).forEach(a=>{
									if(a.slug==talk.slug){
										clear(a)
									}
								})
							}
						}
					})
				case "talk/clear/all":{
					return produce(talks, $talks=>{
						const clear=a=>{
							FileSystem.deleteAsync(`${FileSystem.documentDirectory}${a.id}`,{idempotent:true})
							delete $talks[a.id]
						}
						Object.values($talks).forEach(clear)
					})
				}
				default:
					return talks
			}
			return talks
		},
		plan(plans={},action){
			switch(action.type){
				case "lang/PERSIST":
					return plans
				case "lang/REHYDRATE":
					return action.payload.plan
				case "persist/REHYDRATE":{
					const {plan:{calendar, ...lastPlans}={}}=action.payload||{}
					return {
						...plans,
						calendar,
						...(function deep(a){
								if(a.start){
									a.start=new Date(a.start)
								}else{
									Object.values(a).forEach(deep)
								}
								return a
							})(lastPlans)
						}
				}
				case "plan/calendar":
					return produce(plans,plans=>{
						plans.calendar=action.id
					})
				case "plan/events":
					return produce(plans,plans=>{
						action.events.forEach(({start,eventID})=>{
							const [y,w,d,h]=[start.getFullYear(), start.getWeek(),start.getDay(),Math.floor(start.getHalfHour())]
							plans[y][w][d][h].eventID=eventID
						})
					})
				case "plan":{
					const {plan:{start}}=action
					checkAction(action, ["plan"])
					const [y,w,d,h]=[start.getFullYear(), start.getWeek(),start.getDay(),Math.floor(start.getHalfHour())]
					Calendar.createEvents(store, action.plan, plans[y]?.[w]?.[d]?.[h])
					return immutableSet(plans, [y,w,d,h], action.plan)
				}
				case "plan/remove":{
					const {time:start}=action
					checkAction(action, ["time"])
					const [y,w,d,h]=[start.getFullYear(), start.getWeek(),start.getDay(),Math.floor(start.getHalfHour())]
					Calendar.deleteEvents(plans[y]?.[w]?.[d]?.[h])
					const removed=immutableSet(plans, [y,w,d,h], null)
					return removed||{}
				}
				case "plan/clear":
					return {calendar:plans.calendar}
				case "plan/copy/1":{
					checkAction(action, ["replacements","day","templateDay"])
					const {replacements, day, templateDay}=action
					const template=plans[templateDay.getFullYear()][templateDay.getWeek()][templateDay.getDay()]
					const plan=JSON.parse(JSON.stringify(template),(key,value)=>{
						switch(key){
							case "start":
								return new Date(value).switchDay(day)
							case "id":
								return replacements[value]||value
						}
						return value
					})
					const [y,w,d]=[day.getFullYear(),day.getWeek(),day.getDay()]
					Calendar.createEvents(store, plan, plans[y]?.[w]?.[d])
					return immutableSet(plans,[y,w,d],plan)
				}
				case "plan/copy/7":{
					checkAction(action, ["replacements","day","templateDay"])
					
					const {replacements, day, templateDay}=action
					const template=plans[templateDay.getFullYear()][templateDay.getWeek()]
					const plan=JSON.parse(JSON.stringify(template),(key,value)=>{
						switch(key){
							case "start":
								return new Date(value).switchWeek(day)
							case "id":
								return replacements[value]||value
						}
						return value
					})
					const [y,w]=[day.getFullYear(),day.getWeek()]
					Calendar.createEvents(store, plan, plans[y]?.[w])
					return immutableSet(plans,[y,w],plan)
				}
				
			}
			return plans
		},
		history(state={},{type, ...history}){
			switch(type){
				case "lang/PERSIST":
					return {}
				case "history":
					return {...state, ...history}
			}
			return state
		},	
	}
})();

export const listeners=[
	{
		type:"talk/toggle/favorited",
		async effect(action, {getState, dispatch}){
			const state=getState()
			const {id,favorited, ...talk}=state.talks[action.talk.id]
			if(!favorited || talk.slug==id)
				return

			if(!(await isAdmin(state)))
				return 

			try{
				const unwrap=(({general, shadowing, retelling, dictating, challenging, ...talk})=>talk)(talk);
				// if((globalThis.Widgets[talk.slug]||globalThis.TedTalk).onFavorite){
				// 	dispatch({type:"favorite/queue", talk:{...unwrap,_id:id}})
				// }
				;(globalThis.Widgets[talk.slug]||globalThis.TedTalk).onFavorite?.({id, talk:{...unwrap,_id:id}, state, dispatch});
			}catch(e){
				dispatch({type:"message/error",message:e.message})
			}
		}
	},{
		type:"my/lang",
		async effect(action, api){
			const originalState=api.getOriginalState()
			if(action.lang==originalState.my.lang)
				return 
			//save current for last lang
			try{
				const originalLangData=Object.keys(reducers).reduce((data, k)=>{
					data[k]=reducers[k](originalState[k],{type:"lang/PERSIST"})
					return data
				},{});

				await FileSystem.writeAsStringAsync(
					`${FileSystem.documentDirectory}${originalState.my.lang}.account.json`, 
					JSON.stringify(originalLangData)
				)
				console.info(`saved store for ${originalState.my.lang}`)
			}catch(e){
				console.error(e)
			}

			//rehydrate for current lang
			try{
				const currentLangData=await FileSystem.readAsStringAsync(`${FileSystem.documentDirectory}${action.lang}.account.json`)
				api.dispatch({type:'lang/REHYDRATE', payload:JSON.parse(currentLangData)})
				api.dispatch(TalkApi.util.resetApiState())
			}catch(e){
				console.warn(e)
			}
		}
	}
]

export const middlewares=[ Qili.middleware, Ted.middleware,]

export function selectPlansByDay(state,day){
	const events = state.plan?.[day.getFullYear()]?.[day.getWeek()]?.[day.getDay()];
	if (!events)
		return [];
	return Object.values(events).filter(a=>!!a).map(plan => {
		return {
			start: plan.start.asDateTimeString(),
			end: new Date(plan.start.getTime() + plan.coures * 30 * 60 * 1000).asDateTimeString(),
			plan,
			talk:state.talks[plan.id]
		};
	}).sort((a,b)=>a.plan.start.getTime()-b.plan.start.getTime());
}

const extract=(o,proto)=>!o ? o: Object.keys(o).reduce((a,k)=>(k in proto && (a[k]=o[k]), a),{})

export function selectPolicy(state,policyName,id){
	const Policy=state.my.policy
	if(!policyName)
		return Policy
	const {desc,...policy}={
		...Policy.general,
		...Policy[policyName],
		...extract(globalThis.Widgets[state.talks[id]?.slug]?.defaultProps[policyName],Policy.general),
		...extract(state.talks[id]?.[policyName],Policy.general)}
	return policy
}

export function selectWidgetTalks(state, slug){
	return Object.values(state.talks).filter(a=>a.slug==slug && a.id!=slug)
}

export function getTalkApiState(state){
	return state[TalkApi.reducerPath]
}

export function isOnlyAudio(url){
	return typeof(url)=="string" && url.indexOf("video.mp4")!=-1
}

export function getLang(){

}
