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
			queryFn: async ({slug, lang="en", id},{getState})=>{
				const Widget=globalThis.Widgets[slug]
				if(Widget){
					const {defaultProps:{id:_id, slug, title, description, thumb}}=Widget
					if(!!id){
						return {data:{id, slug, title, description, thumb}}
					}else{
						return {data:{id:_id, slug, title, description, thumb, ...getState().talks[id]}}
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
				})
				return {data:{talks}}
			}
		}),
	})
})

export function createStore(needPersistor){
	const checkAction=(action,keys)=>{
		const missing=keys.filter(a=>action[a]==undefined)
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
			case `${book}/tag`:{
				return produce(items,items=>{
					checkAction(action, ["tag","uri"])
					const {tag, uri}=action
					if(!tag)
						return items
					const item=items.find(a=>a.uri==uri)
					const i=(item.tags=item.tags||[]).indexOf(tag)
					if(i==-1){
						item.tags.push(tag)
					}else{
						item.tags.splice(i,1)
					}
					return items
				})
			}
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
								return checkAction(action,["target","payload"]) && {
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
						switch(action.type){
							case "talk/toggle":
								return produce(talks, talks=>{
									const {key,value, policy,payload={[key]:value}, talk:{slug, title, thumb,duration,link,id}}=action
									const talk=talks[id]||(talks[id]={slug, title, thumb,duration,link,id})
									checkAction(action, ["talk"])
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
												break
											}
											default:
												talk[key]=value!=undefined ? value : !talk[key]
										}
									})
									
								})
							case "talk/policy":
								return produce(talks, talks=>{
									checkAction(action, ["payload","talk"])
									const {target="general", payload, talk:{slug, title, thumb,duration,link,id}}=action
									const talk=talks[id]||(talks[id]={slug, title, thumb,duration,link,id})
									if(talk[target]?.challenging){
										delete payload.chunk
									}
									talk[target]={...talk[target], ...payload}
								})
							case "talk/challenge":{
								return produce(talks, talks=>{
									checkAction(action, ["chunk","talk"])
									const {policy="general",chunk, talk:{slug, title, thumb,duration,link,id}}=action
									const talk=talks[id]||(talks[id]={slug, title, thumb,duration,link,id})

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
								})
							}
							case "talk/recording":
								return produce(talks, talks=>{
									checkAction(action, ["record","talk","policy"])
									const {record, policy,talk:{slug, title, thumb,duration,link,id}}=action
									const talk=talks[id]||(talks[id]={slug, title, thumb,duration,link,id})
									const {records=[]}=(talk[policy]||(talk[policy]={}));
									(talk[policy].records=records)[Object.keys(record)[0]]=Object.values(record)[0]
								})
							case "talk/clear/history":
								return produce(talks, talks=>{
									checkAction(action, ["id"])
									const talk=talks[action.id]
									if(talk){ 
										Object.keys(Policy).forEach(policy=>{
											FileSystem.deleteAsync(`${FileSystem.documentDirectory}${talk.id}/${policy}`,{idempotent:true})
											talk[policy]=!talk.isWidget ? undefined : globalThis.Widgets[talk.id].defaultProps[policy]
										})
									}
								})
							case "talk/clear":
								return produce(talks, talks=>{
									FileSystem.deleteAsync(`${FileSystem.documentDirectory}${action.id}`,{idempotent:true})
									delete talks[action.id]
								})
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
								checkAction(action, ["plan"])
								return immutableSet(state, [start.getFullYear(), start.getWeek(),start.getDay(),Math.floor(start.getHalfHour())], action.plan)
							}
							case "plan/remove":{
								const {time:start}=action
								checkAction(action, ["time"])
								const removed=immutableSet(state, [start.getFullYear(), start.getWeek(),start.getDay(),Math.floor(start.getHalfHour())], null)
								return removed||{}
							}/*
							case "plan/day/template":
								return immutableSet(state, ['day'], state.day==action.day ? null : action.day)
							case "plan/week/template":
								return immutableSet(state, ['week'], Date.from(action.day).isSameWeek(state.week) ? null : action.day)
							*/
							case "plan/copy/1":{
								checkAction(action, ["replacements","day","templateDay"])
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
								checkAction(action, ["replacements","day","templateDay"])
								
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
					audiobook:createBookReducer("audiobook"),
					picturebook:createBookReducer('picturebook'),
			})),

		middleware: (getDefaultMiddleware) =>getDefaultMiddleware({
				serializableCheck:{
					ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
					isSerializable(value){
						return isPlain(value)||value?.constructor===Date
					}
				}
			}).concat(Ted.middleware,Ted.middleware),
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

export {Ted, StoreProvider as Provider,}

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

export function selectBook(state, slug, tag){
	const {[slug]:data}=state
	if(!tag){
		return data
	}
	return data.filter(a=>a.tags && a.tags.indexOf(tag)!=-1)
}