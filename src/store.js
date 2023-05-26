import React from "react"
import { combineReducers } from "redux"
import { configureStore, isPlain } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { createApi } from "@reduxjs/toolkit/query/react";
import ExpoFileSystemStorage from "redux-persist-expo-filesystem"
import {XMLParser} from 'fast-xml-parser'

import { Provider } from "react-redux"
import { PersistGate } from 'redux-persist/integration/react'
import { persistStore,persistReducer, FLUSH,REHYDRATE,PAUSE,PERSIST,PURGE,REGISTER } from 'redux-persist'
import * as FileSystem from "expo-file-system"
import cheerio from "cheerio"
import { produce } from "immer"

import { getYoutubeMeta } from "react-native-youtube-iframe"
import { YoutubeTranscript } from "./experiment/youtube-transcript"


import * as Calendar from "./experiment/calendar"

export const Policy={
	general: {
		desc: "General options to control player and reaction.",
		visible: true,
		caption: true,
		captionDelay: 0,
		volume: undefined,
		speed: 1,
		whitespace: 0, //whitespace time to start next
		record: false,
		chunk: 0, //0:chunck by chunck, n: chunks totally n seconds, 7: paragraph, 10: whole
		autoHide: true,
		autoChallenge:60,
		fullscreen: false,
	},
	shadowing: {
		desc: "options when you learn language by shadowing chunck by chunck",
		whitespace: 1,
		record: true,
		chunk: 0,
	},
	dictating: {
		desc: "options when you learn language by dictating chuncks by chunks",
		whitespace: 1,
		record: true,
		captionDelay: 1,
		chunk: 1, //1s
	},
	retelling: {
		desc: "options when you lean language by retelling the story paragraph by paragraph",
		whitespace: 1,
		record: true,
		captionDelay: 1,
		chunk: 7, //paragraph
	},
}

const Ted=createApi({
	reducerPath:"ted",
	baseQuery:(({baseUrl})=>async({context, headers})=>{	
		if(!context){
			return {data:""}
		}
		const res=await fetch(`${baseUrl}${context}`,{
			headers:{
				"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 11_6_8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36",
				...headers,
			},
		})
		return {data:await res.text()}
	})({baseUrl:"https://www.ted.com"}),
	endpoints:builder=>({
		talk:builder.query({
			queryFn: async ({slug},{getState})=>{
				const {lang="en", mylang="zh-cn"}=getState().my
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
				const {id, resources, title, thumb, languages, duration}=JSON.parse(playerData)
				const talk={
					id, title, thumb, languages, duration,description,
					video: resources.hls.stream,
				}
				
				talk.languages=talk.languages.reduce((langs,a)=>(langs[a.languageCode]=a,langs),{})
				
				if(!translation)
					return {data:talk}

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
						return []
					const i=vtt.indexOf("\n",i0+2)
					try{
						const text= vtt.substring(i+1, vtt.indexOf("\n", i+1))
						return [start, end, text]
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
					cue.my=nextCue()?.text
					lastCue=cue
				})))();

				StoreProvider.store?.dispatch({type:"talk/create", talk})

				return {data:talk}
			},
		}),
		videos:builder.query({
			query:({q, page})=>({context:!q ? null : `/search?cat=videos${q ? `&q=${encodeURI(q)}` :""}${page>1 ? `&page=${page}`:""}`}),
			transformResponse(data, meta, {page}){
				const $=cheerio.load(data)
				const talks=$(".search-results .search__result").map((i,el)=>{
					const $el=$(el)
					const link=$el.find("h3>a.ga-link").first()
					return {
						title:link.text(),
						slug:link.attr("href").split("/").pop(),
						thumb:$el.find('img').attr('src'),
						desc:$el.find('.search__result__description').text(),
					}
				}).toArray()
				const pages=parseInt($(".search__pagination .pagination__item").last().text())||1
				return {talks,page,pages}
			},
		}),

		talks:builder.query({
			query:({q, page})=>{
				let minutes=0
				q=q.replace(/((\d+)\s*minutes)/ig, (full, $1, $2)=>(minutes=parseInt($2),"")).trim()
				const query=[
					minutes>0 && `duration=${(Math.ceil(minutes/6)-1)*6}-${Math.ceil(minutes/6)*6}`,
					!!q ? "sort=relevance" : "sort=newest",
					!!q && `q=${encodeURI(q)}`,
					page>1 && `page=${page}`
				].filter(a=>!!a).join("&")

				return {context:`/talks${!!query ? `?${query}` :""}`}
			},
			transformResponse(data, meta, {page}){
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
				return {talks,page,pages}
			},
		}),

		people:builder.query({
			query:({q})=>({context:!q ? null : `/search?cat=people&q=${encodeURI(q)}`}),
			transformResponse(data){
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
				return talks
			}
		}),
		speakerTalks:builder.query({
			query:({q})=>({context:!q ? null : `/speakers/${q}`}),
			transformResponse(data){
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
				return {talks}
			}
		}),
		today:builder.query({
			queryFn:async (day)=>{
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
			}
		}),
	})
})

const Youtube=createApi({
	reducerPath:"youtube",
	endpoints:builder=>({
		talk:builder.query({
			queryFn: async ({id},{getState})=>{
				try{
					const {lang, mylang}=getState().my
					const {title, thumbnail_url:thumb, author_name:author,} = await getYoutubeMeta(id)
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
					const talk={title, id, slug:`youtube`, thumb, languages:{mine:[{cues:transcripts}]}, video:id, description:`by ${author}`}
					StoreProvider.store?.dispatch({type:"talk/create", talk})
					return {data:talk}
				}catch(error){
					return {error}
				}
			}
		})
	})
})

export function createStore(needPersistor){
	const checkAction=(action,keys)=>{
		const missing=keys.filter(a=>!(a in action))
		if(missing.length>0){
			throw new Error(`action[${action.type}] miss keys[${missing.join(",")}]`)
		}
		return true
	}

	const createBookReducer=book=>(items=[],{type,...action})=>{
		switch(type){
			case `${book}/record`:
				return [...items,action]
			case `${book}/set`:
				return produce(items,items=>{
					checkAction(action, ["uri"])
					const {uri, ...props}=action
					const item=items.find(a=>a.uri==uri)
					Object.assign(item, props)
					return items
				})
			case `${book}/remove`:{
				return produce(items, items=>{
					checkAction(action, ["uri"])
					const i=items.findIndex(a=>a.uri==action.uri)
					if(i!=-1){
						try{
							FileSystem.deleteAsync(action.uri,{idempotent:true})
						}finally{
							items.splice(i,1)
						}
					}
				})
				
			}
			case "talk/clear":{
				if(action.slug!==book){
					break
				}else if(action.id!==book){//clear a tagged book
					return items.filter(a=>{
						if(a.tags?.indexOf(action.tag)>-1){
							try{
								a.uri && FileSystem.deleteAsync(a.uri,{idempotent:true})
								a.audio && FileSystem.deleteAsync(a.audio,{idempotent:true})
							}catch{}
							return false
						}
						return true
					})
				}else if(action.id==book){
					//same as book/clear, continue 
				}
			}
			case "talk/clear/all":
			case `${book}/clear`:{
				items.forEach(a=>{
					try{
						a.uri && FileSystem.deleteAsync(a.uri,{idempotent:true})
						a.audio && FileSystem.deleteAsync(a.audio,{idempotent:true})
					}catch{

					}
				})
				return []
			}
		}
		return items
	}

	const store = configureStore({
		/** reducer can't directly change any object in state, instead shallow copy and change */
		reducer: 
			persistReducer(
				{key:"root",version:1,blacklist:[],storage:ExpoFileSystemStorage},
				combineReducers({
					[Ted.reducerPath]: Ted.reducer,
					[Youtube.reducerPath]: Youtube.reducer,
					my(state = {policy:Policy, lang:"en", mylang: "zh-cn", since:Date.now()}, action) {
						switch (action.type) {
							case "persist/REHYDRATE":
								return produce(state, $state=>{
									const history=action.payload?.my?.policy
									if(history?.general){
										Object.assign($state.policy.general, history.general)
										Object.assign($state.policy.shadowing, history.shadowing)
										Object.assign($state.policy.dictating, history.dictating)
										Object.assign($state.policy.retelling, history.retelling)
									}
								})
							case "policy":
								return produce(state, $state=>{
									checkAction(action,["target","payload"])
									Object.assign($state.policy[action.target], action.payload)
								})
							case "my/tts":
								return {...state, tts:{...state.tts, ...action.payload}}
							case "my":
								return {...state, ...action.payload}
						}
						return state
					},
					talks(talks={},action){
						const getTalk=(action, $talks)=>{
							checkAction(action, ["talk"])
							const {talk:{slug, title, thumb,duration,link,id, video, ...$payload}, key,value, policy,payload=key ? {[key]:value} : $payload, ...others}=action
							return {
								talk: $talks[id]||($talks[id]={slug, title, thumb,duration,link,id, video}),
								payload, policy, ...others
							}
						}
						switch(action.type){
							case "talk/create":
								return produce(talks, $talks=>{
									$talks[action.talk.id]={...action.talk}
								})
							case "talk/toggle":
								return produce(talks, $talks=>{
									const {talk, payload, policy}=getTalk(action, $talks)
									Object.keys(payload).forEach(key=>{
										let value=payload[key]
										switch(key){
											case "challenging":{
												checkAction(action, ["policy"])
												const hasChallenges=talk[policy]?.challenges?.length>0
												if(value==undefined){
													(talk[policy]||(talk[policy]={})).challenging=hasChallenges
												}else if(value===true && hasChallenges){
													(talk[policy]||(talk[policy]={})).challenging=true
												}
												if(talk[policy]){
													delete talk[policy].history
												}
												break
											}
											default:
												talk[key]=value!=undefined ? value : !talk[key]
										}
									})
									
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
							case "talk/fix/chunk":
								return produce(talks, $talks=>{
									const {talk, time}=getTalk(action, $talks)
									if(talk.fixes){
										if(talk.fixes.indexOf(time)==-1)
											talk.fixes=[time, ...talk.fixes]
									}else{
										talk.fixes=[time]
									}
								})
							case "talk/challenge":{
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
									}
								})
							}
							case "talk/challenge/remove":{
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
									}
								})
							}
							case "talk/recording":
								return produce(talks, $talks=>{
									checkAction(action, ["record","talk","policy"])
									const {talk, policy:policyName, record, score}=getTalk(action, $talks)

									const {records={}, challenges, challenging}=(talk[policyName]||(talk[policyName]={}));
									(talk[policyName].records=records)[Object.keys(record)[0]]=Object.values(record)[0]
									records.changed=Date.now()
								})
							case "talk/recording/miss":
								return produce(talks, data=>{
									checkAction(action, ["record", "policy"])
									const {record, policy, talk : {id}}=action
									delete data[id]?.[policy]?.records?.[record]
								})
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
					},
					plan(plans={},action){
						switch(action.type){
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
							case "history":
								return {...state, ...history}
						}
						return state
					},
					audiobook:createBookReducer("audiobook"),
					picturebook:createBookReducer('picturebook'),
			})),

		middleware: (getDefaultMiddleware) =>getDefaultMiddleware({
				serializableCheck:{
					ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
					isSerializable(value){
						return isPlain(value)||value?.constructor===Date
					}
				},
				immutableCheck:{
					warnAfter:100,
				},
			}).prepend([Ted.middleware, Youtube.middleware]),
	})
	const persistor=needPersistor ? persistStore(store) : undefined
	setupListeners(store)
	return {store, persistor}
}

const StoreProvider=({children, persistor:needPersistor=true, onReady})=>{
	const {store, persistor}=React.useMemo(()=>{
		const data=createStore(needPersistor)
		const unsub=data.store.subscribe(()=>{
			const state=data.store.getState()
			if(state._persist?.rehydrated){
				unsub()
				setTimeout(()=>onReady?.(),4000)
			}
		})
		return data
	},[])
	StoreProvider.store=store
	return (
		<Provider store={store}>
			{!!persistor && <PersistGate {...{loading:null, persistor}}>
				{children}
			</PersistGate>}
			{!persistor && children}
		</Provider>
	)
}

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

export {Ted, Youtube, StoreProvider as Provider,}

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
		...extract(state.talks[id]?.[policyName],Policy.general)}
	return policy
}

export function selectBook(state, slug, tag){
	const {[slug]:data}=state
	const selected=(()=>{
		if(!tag){
			return data
		}
		return data.filter(a=>a.tags && a.tags.indexOf(tag)!=-1)
	})();
	return selected.map(a=>({...a}))
}