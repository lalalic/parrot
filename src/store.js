import {combineReducers} from "redux"
import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { createApi } from "@reduxjs/toolkit/query/react";
import {persistReducer} from "redux-persist"
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
							const policy=action.payload?.policy
							policy.general.autoHide=true
							return Object.keys(state).reduce((merged,k)=>{
								merged[k]={...state[k],...merged[k]}
								return merged
							},{...policy})
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
				talks(state={version:3},action){
					switch(action.type){
						case "persist/REHYDRATE":
							return {...action.payload.talks,version:3}
					}
					
					if(!action.type.startsWith("talk/"))
						return state

					const {id,talk:{slug, title, thumb,duration,link}={}}=action
					const talk=state[id]||{slug, title, thumb,duration,link,id}
					switch(action.type){
						case "talk/toggle":{
							const {key,value}=action
							return {...state, [id]:{...talk,[key]:typeof(value)!="undefined" ? value : !!!talk[key]}}
						}
						case "talk/challenge":{
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
							
							return {...state, [id]: {...talk, [policy]:{...talk[policy],challenges}}}
						}
						case "talk/recording":{
							const { record,policy="general"}=action
							return {...state, [id]: {...talk, [policy]:{...talk[policy],records:{...talk[policy]?.records, ...record}}}}
						}
						case "talk/clear/policy/record":{
							if(state[id]){
								const {policy="general"}=action
								FileSystem.deleteAsync(`${FileSystem.documentDirectory}${id}/${policy}/audios`,{idempotent:true})
								const newPolicy={...talk[policy]}
								delete newPolicy.records
								return {...state, [id]: {...talk, [policy]:newPolicy}}
							}
						}
						case "talk/clear/policy":{
							if(state[id]){
								const {policy="general"}=action
								FileSystem.deleteAsync(`${FileSystem.documentDirectory}${id}/${policy}`,{idempotent:true})
								const newTalk={...talk}
								delete newTalk[policy]
								return {...state, [id]: newTalk}
							}
						}
						case "talk/clear":{
							if(state[id]){
								FileSystem.deleteAsync(`${FileSystem.documentDirectory}${id}`,{idempotent:true})
								const newState={...state}
								delete newState[id]
								return newState
							}
						}
						default:
							return state
					}
				},
				plan(state={},{type,...payload}){
					switch(type){
						case "plan":{
							const {plan:{start}}=payload
							return immutableSet(state, payload.plan,  [start.getFullYear(), start.getWeek(),start.getDay(),Math.floor(start.getHalfHour())])
						}
					}
					return state
				}
		})),

	middleware: (getDefaultMiddleware) =>getDefaultMiddleware({
			serializableCheck:{
				ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER]
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

function immutableSet(o, value, keys){
	if(keys.length==1)
		return {...o, [keys[0]]:value}
	const first=keys.shift()
	return {...o, [first]: immutableSet({...o[first]},value, keys)}
}

export {
	Ted, 
	StoreProvider as Provider,
}