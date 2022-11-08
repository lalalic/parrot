import {combineReducers} from "redux"
import { configureStore, isPlain } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { createApi } from "@reduxjs/toolkit/query/react";
import { persistReducer} from "redux-persist"
import ExpoFileSystemStorage from "redux-persist-expo-filesystem"

import { Provider } from "react-redux"
import { PersistGate } from 'redux-persist/integration/react'
import { persistStore,FLUSH,REHYDRATE,PAUSE,PERSIST,PURGE,REGISTER } from 'redux-persist'
import * as FileSystem from "expo-file-system"

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

const graphqlBaseQuery =({ baseUrl }) =>async ({ body }) => {
    const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(body)
    });
    return response.json()
}

const Ted = createApi({
	reducerPath: "ted",
	baseQuery: graphqlBaseQuery({
		baseUrl: "https://www.ted.com/graphql",
	}),
	endpoints: (builder) => ({
		talk: builder.query({
			query: (slug, lang="en") => ({
				body: {
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
				},
			}),
			transformResponse: async (data) => {
				if(!data.translation)
					return data
				const {translation, video: { playerData, ...metadata },}=data
				const talk={
					...JSON.parse(playerData),
					...metadata
				}
				
				talk.languages=talk.languages.reduce((langs,a)=>(langs[a.languageCode]=a,langs),{})
				
				if(!translation)
					return talk

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
				return talk
			},
		}),
	}),
});

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
						const {id,talk:{slug, title, thumb,duration,link}={}}=action
						return [talks[id]||{slug, title, thumb,duration,link,id}, id]
					}

					switch(action.type){
						case "talk/toggle":{
							const {key,value}=action
							const [talk,id]=selectTalk()
							return {...talks, [id]:{...talk,[key]:typeof(value)!="undefined" ? value : !!!talk[key]}}
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
							let [id, talk]=selectTalk()
							if(talks[id]){
								Object.keys(Policy).forEach(policy=>{
									FileSystem.deleteAsync(`${FileSystem.documentDirectory}${id}/${policy}`,{idempotent:true})
									talk=immutableSet(talk, null, [policy])
								})
								return {...talks, [id]: talk}
							}
						}
						case "talk/clear":{
							const [id]=selectTalk()
							if(talks[id]){
								FileSystem.deleteAsync(`${FileSystem.documentDirectory}${id}`,{idempotent:true})
								return immutableSet(talks, null, [id])
							}
						}
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
							return immutableSet(state, action.plan,  [start.getFullYear(), start.getWeek(),start.getDay(),Math.floor(start.getHalfHour())])
						}
						case "plan/remove":{
							const {time:start}=action
							const removed=immutableSet(state, null,  [start.getFullYear(), start.getWeek(),start.getDay(),Math.floor(start.getHalfHour())])
							return removed||{}
						}
						case "plan/day/template":
							return immutableSet(state,state.day==action.day ? null : action.day, ['day'])
						case "plan/week/template":
							return immutableSet(state,Date.from(action.day).isSameWeek(state.week) ? null : action.day, ['week'])
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
							return immutableSet(state,plan,[day.getFullYear(),day.getWeek(),day.getDay()])
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
							return immutableSet(state,plan,[day.getFullYear(),day.getWeek()])
						}
						
					}
					return state
				}
		})),

	middleware: (getDefaultMiddleware) =>getDefaultMiddleware({
			serializableCheck:{
				ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
				isSerializable(value){
					return isPlain(value)||value?.constructor===Date
				}
			}
		}).concat(Ted.middleware),
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

function immutableSet(o, value, keys, returnEmpty=true){
	if(keys.length==1){
		return value===null ? nullClear(o,keys[0], returnEmpty) : {...o, [keys[0]]:value}
	}
	const first=keys.shift()
	const firstValue=immutableSet({...o[first]},value, keys, false)
	return firstValue===null ? nullClear(o, first, returnEmpty) : {...o, [first]: firstValue}
}

export {
	Ted, 
	StoreProvider as Provider,
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