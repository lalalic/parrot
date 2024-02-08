import * as FileSystem from "expo-file-system";
import { myReducer} from "react-native-use-qili/store";
import { produce } from "immer";


import { Qili, Ted, Services, TalkApi } from "./services";
export {Qili, Ted, TalkApi}

import Policy from "./policy"
import history from "./reducers/history"
import plan from "./reducers/plan"
import talks, {listeners as TalksListeners} from "./reducers/talks"
import message from "./reducers/message"

const l10n=globalThis.l10n

export const reducers={
	talks, plan, history, message,
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
		lang:"en", mylang: l10n.getLanguage(), tts:{}, 
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
	}	
}

export const listeners=[
	...TalksListeners,
	{
		type: "my/lang",
		async effect(action, api) {
			const originalState = api.getOriginalState();
			if (action.lang == originalState.my.lang)
				return;
			//save current for last lang
			try {
				const originalLangData = Object.keys(reducers).reduce((data, k) => {
					data[k] = reducers[k](originalState[k], { type: "lang/PERSIST" });
					return data;
				}, {});

				await FileSystem.writeAsStringAsync(
					`${FileSystem.documentDirectory}${originalState.my.lang}.account.json`,
					JSON.stringify(originalLangData)
				);
				console.info(`saved store for ${originalState.my.lang}`);
			} catch (e) {
				console.error(e);
			}

			//rehydrate for current lang
			try {
				const currentLangData = await FileSystem.readAsStringAsync(`${FileSystem.documentDirectory}${action.lang}.account.json`);
				api.dispatch({ type: 'lang/REHYDRATE', payload: JSON.parse(currentLangData) });
				api.dispatch(TalkApi.util.resetApiState());
			} catch (e) {
				console.warn(e);
			}
		}
	},
	// {
	// 	type:"persist/REHYDRATE",
	// 	async effect(action, api){
	// 		const {my:{mylang}}=api.getState()
	// 		const currentUILang=l10n.getLanguage()
	// 		if(mylang){
	// 			l10n.setLanguage(mylang)
	// 			const nextUILang=l10n.getLanguage()
	// 			if(currentUILang!=nextUILang){
	// 				api.dispatch({type:"my/uilang", uilang:nextUILang})
	// 			}
	// 		}
	// 	}
	// }
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

export function selectPolicy({state=globalThis.store.getState(),policyName,id}){
	const Policy=state.my.policy
	if(!policyName)
		return Policy
	const Widget=globalThis.Widgets[state.talks[id]?.slug]
	const {desc,...policy}=extract({
		...Policy.general,
		...Policy[policyName],
		...Widget?.defaultProps?.[policyName],
		...state.talks[id]?.[policyName]
	},{...Policy.general, ...Widget?.getDerivedStateFromProps?.(Widget?.defaultProps)})
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

/*******unsafe, only works after store loaded*******/
export function _getLang(state=globalThis.store?.getState()){
	return state?.my.lang
}

export function _getMyLang(state=globalThis.store?.getState()){
	return state?.my.mylang
}
/*****end unsafe ************/
