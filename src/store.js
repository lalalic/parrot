import { combineReducers } from "redux"
import { configureStore, isPlain } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { createApi } from "@reduxjs/toolkit/query/react";
import { persistReducer} from "redux-persist"
import ExpoFileSystemStorage from "redux-persist-expo-filesystem"
import {XMLParser} from 'fast-xml-parser'

import { Provider } from "react-redux"
import { PersistGate } from 'redux-persist/integration/react'
import { persistStore,FLUSH,REHYDRATE,PAUSE,PERSIST,PURGE,REGISTER } from 'redux-persist'
import * as FileSystem from "expo-file-system"
import cheerio from "cheerio"
import { produce } from "immer"

const Policy={
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
	tagTypes:["talk","widget"],
	endpoints:builder=>({
		talk:builder.query({
			queryFn: async ({slug, lang="en", id},{getState})=>{
				if(slug && globalThis.Widgets[slug]){
					const props=globalThis.Widgets[slug].defaultProps
					if(!!id){
						return {data:props}
					}else{
						return {data:{...props, ...getState().talks[id]}}
					}
				}
				
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
								nativeDownloads{
								medium
								}
							}
						}`,
					}),
				})
				const {data}=await res.json()
					
				const {translation, video: { playerData, ...metadata },}=data
				const talk={
					...JSON.parse(playerData),
					...metadata
				}
				
				talk.languages=talk.languages.reduce((langs,a)=>(langs[a.languageCode]=a,langs),{})
				
				if(!translation)
					return {data:talk}

				const {paragraphs}=translation

				talk.languages.en.transcript=paragraphs
				
				const resHlsMeta=await fetch(talk.resources.hls.metadata)
				const hlsMeta=await resHlsMeta.json()
				const resVtt=await fetch(hlsMeta.subtitles[0].webvtt)
				const vtt=await resVtt.text()

				let last=0
				const nextCue=()=>{
					const i0=vtt.indexOf("\n\n",last)
					const i=vtt.indexOf("\n",i0+2)
					const duration=vtt.substring(i0+2,i)
					try{
						return duration.split("-->").map(a=>{
							const [h,m,s]=a.split(":")
							return parseInt(s.replace(".",""))+(h*60+m)*60*1000
						})
					}finally{
						last=i+1
					}
				}
				paragraphs.forEach(p=>p.cues.forEach(cue=>{
					const [start, end]=nextCue()
					cue.time=start
					cue.end=end
				}))
				return {data:talk}
			},
			providesTags(result, error, {slug}){
				if(slug && globalThis.Widgets[slug])
					return ['widget']
				return ['talk']
			}
		}),
		talks:builder.query({
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
			}
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
				})
				return {data:{talks}}
			}
		}),
	})
})

const store = configureStore({
	/** reducer can't directly change any object in state, instead shallow copy and change */
	reducer: 
		persistReducer(
			{key:"root",version:1,blacklist:[],storage:ExpoFileSystemStorage},
			combineReducers({
				[Ted.reducerPath]: Ted.reducer,
				policy(state = Policy, action) {
					switch (action.type) {
						case "persist/REHYDRATE":{
							if(action.payload?.policy){
								const policy=action.payload.policy
								return Object.keys(state).reduce((merged,k)=>{
									merged[k]={...state[k],...merged[k]}
									return merged
								},{...policy})
							}
							break
						}
						case "policy":
							return {
								...state,
								[action.target]: {
									...state[action.target],
									...action.payload,
								},
							};
					}
					return state;
				},
				talks(talks={},action){
					const selectTalk=()=>{
						const {id:_id, talk:{slug, title, thumb,duration,link,id=_id}={}}=action
						return [talks[id]||{slug, title, thumb,duration,link,id}, id]
					}

					switch(action.type){
						case "talk/toggle":{
							const {key,value, policy}=action
							const [talk,id]=selectTalk()
							switch(key){
								case "challenging":{
									const hasChallenges=talk[policy]?.challenges?.length>0
									if(value==undefined){
										return {...talks, [id]:{...talk, [policy]:{...talk[policy],challenging:hasChallenges}}}
									}else if(value===true && hasChallenges){
										return {...talks, [id]:{...talk, [policy]:{...talk[policy],challenging:true}}}
									}
									return talks
								}
								default:
									return {...talks, [id]:{...talk,[key]:typeof(value)!="undefined" ? value : !!!talk[key]}}
							}
						}
						case "talk/challenge":{
							const [talk, id]=selectTalk()
							const {chunk, policy="general"}=action
							let {challenges=[]}=talk[policy]||{}
							const i=challenges.findIndex(a=>a.time>=chunk.time)
							if(i==-1){
								challenges=[...challenges,chunk]
							}else if(challenges[i].time==chunk.time){
								(challenges=[...challenges]).splice(i,1,chunk)
							}else{
								(challenges=[...challenges]).splice(i,0,chunk)
							}
							
							return {...talks, [id]: {...talk, [policy]:{...talk[policy],challenges}}}
						}
						case "talk/recording":{
							const [talk, id]=selectTalk()
							const { record,policy="general"}=action
							return {...talks, [id]: {...talk, [policy]:{...talk[policy],records:{...talk[policy]?.records, ...record}}}}
						}
						case "talk/clear/history":{
							const {id}=action
							let talk=talks[id]
							if(!talk)
								break
							
							Object.keys(Policy).forEach(policy=>{
								FileSystem.deleteAsync(`${FileSystem.documentDirectory}${id}/${policy}`,{idempotent:true})
								talk=immutableSet(talk, [policy], 
									!talk.isWidget ? null : 
										(({policy:a,[policy]:b=a})=>b)(globalThis.Widgets[talk.id].defaultProps)
								)
							})
							return {...talks, [id]: talk}
						}
						case "talk/clear":{
							const {id}=action
							let talk=talks[id]
							if(!talk)
								break
							FileSystem.deleteAsync(`${FileSystem.documentDirectory}${id}`,{idempotent:true})
							return immutableSet(talks, [id], null)
						}
						case "talk/clear/all":
							return {}
						default:
							return talks
					}
				},
				plan(state={},action){
					switch(action.type){
						case "persist/REHYDRATE":{
							if(action.payload?.plan){
								return (function deep(a){
									if('start' in a){
										a.start=new Date(a.start)
									}else{
										Object.values(a).forEach(deep)
									}
									return a
								})(action.payload.plan);
							}
							break
						}
						case "plan":{
							const {plan:{start}}=action
							return immutableSet(state, [start.getFullYear(), start.getWeek(),start.getDay(),Math.floor(start.getHalfHour())], action.plan)
						}
						case "plan/remove":{
							const {time:start}=action
							const removed=immutableSet(state, [start.getFullYear(), start.getWeek(),start.getDay(),Math.floor(start.getHalfHour())], null)
							return removed||{}
						}
						case "plan/day/template":
							return immutableSet(state, ['day'], state.day==action.day ? null : action.day)
						case "plan/week/template":
							return immutableSet(state, ['week'], Date.from(action.day).isSameWeek(state.week) ? null : action.day)
						case "plan/copy/1":{
							const {replacements, day, templateDay}=action
							const template=state[templateDay.getFullYear()][templateDay.getWeek()][templateDay.getDay()]
							const plan=JSON.parse(JSON.stringify(template),(key,value)=>{
								switch(key){
									case "start":
										return new Date(value).switchDay(day)
									case "id":
										return replacements[value]||value
								}
								return value
							})
							return immutableSet(state,[day.getFullYear(),day.getWeek(),day.getDay()],plan)
						}
						case "plan/copy/7":{
							const {replacements, day, templateDay}=action
							const template=state[templateDay.getFullYear()][templateDay.getWeek()]
							const plan=JSON.parse(JSON.stringify(template),(key,value)=>{
								switch(key){
									case "start":
										return new Date(value).switchWeek(day)
									case "id":
										return replacements[value]||value
								}
								return value
							})
							return immutableSet(state,[day.getFullYear(),day.getWeek()],plan)
						}
						
					}
					return state
				},
				history(state={},{type, ...history}){
					switch(type){
						case "history":
							return {...state, ...history}
					}
					return state
				},
				audiobook(audios=[],{type,...action}){
					switch(type){
						case "audiobook/record":
							return [...audios,action]
						case "audiobook/remove":{
							const i=audios.indexOf(a=>a.uri==action.uri)
							FileSystem.deleteAsync(action.uri,{idempotent:true})
							return (a=>(a.splice(i,1), a))([...audios])
						}
						case "audiobook/tag":{
							return produce(audios,audios=>{
								const {tag, uri}=action
								if(!tag)
									return audios
								const audio=audios.find(a=>a.uri==uri)
								const i=(audio.tags=audio.tags||[]).indexOf(tag)
								if(i==-1){
									audio.tags.push(tag)
								}else{
									audio.tags.splice(i,1)
								}
								return audios
							})
						}
						case "audiobook/clear":{
							audios.forEach(a=>{
								FileSystem.deleteAsync(a.uri,{idempotent:true})
							})
							return []
						}
					}
					return audios
				},
				picturebook(pictures=[],{type,...action}){
					switch(type){
						case "picturebook/record":
							return [...pictures,action]
						case "picturebook/set":
							return produce(pictures,pictures=>{
								const {uri, ...props}=action
								const picture=pictures.find(a=>a.uri==uri)
								Object.assign(picture, props)
								return pictures
							})
						case "picturebook/remove":{
							const i=pictures.indexOf(a=>a.uri==action.uri)
							FileSystem.deleteAsync(action.uri,{idempotent:true})
							return (a=>(a.splice(i,1), a))([...pictures])
						}
						case "picturebook/tag":{
							return produce(pictures,pictures=>{
								const {tag, uri}=action
								if(!tag)
									return pictures
								const picture=pictures.find(a=>a.uri==uri)
								const i=(picture.tags=picture.tags||[]).indexOf(tag)
								if(i==-1){
									picture.tags.push(tag)
								}else{
									picture.tags.splice(i,1)
								}
								return pictures
							})
						}
						case "picturebook/clear":{
							pictures.forEach(a=>{
								FileSystem.deleteAsync(a.uri,{idempotent:true})
								FileSystem.deleteAsync(a.audio,{idempotent:true})
							})
							return []
						}
					}
					return pictures
				},
		})),

	middleware: (getDefaultMiddleware) =>getDefaultMiddleware({
			serializableCheck:{
				ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
				isSerializable(value){
					return isPlain(value)||value?.constructor===Date
				}
			}
		}).concat(Ted.middleware,Ted.middleware),
});

const persistor=persistStore(store)
setupListeners(store.dispatch)

const StoreProvider=({children})=>(
	<Provider store={store}>
        <PersistGate {...{loading:null, persistor}}>
            {children}
        </PersistGate>
    </Provider>
)

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

export {
	Ted, 
	StoreProvider as Provider,
	store,
}

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
	const Policy=state.policy
	const {desc,...policy}={
		...Policy.general,
		...Policy[policyName],
		...extract(state.talks[id]?.[policyName],Policy.general)}
	return policy
}

export function selectBook(slug, tag){
	const {[slug]:data}=store.getState()
	if(!tag){
		return data
	}
	return data.filter(a=>a.tags && a.tags.indexOf(tag)!=-1)
}