import * as FileSystem from "expo-file-system";
import { produce } from "immer";
import { isAdmin } from "react-native-use-qili/store";
import FlyMessage from "react-native-use-qili/components/FlyMessage";

import { diffScore } from "../../experiment/diff";
import Policy from "../policy";
import { selectPlansByDay } from "./plan"
const l10n=globalThis.l10n

function checkAction(action, keys) {
	const missing = keys.filter(a => !(a in action));
	if (missing.length > 0) {
		throw new Error(`Talks action[${action.type}] miss keys[${missing.join(",")}]`);
	}
	return true;
}

function getTalk(action, talks){
	const { talk: { slug, id, ...$payload }, key, value, policy, payload = key ? { [key]: value } : $payload, ...others } = action;
	const { talk: { title, thumb, duration, link, video, data } } = action;
	return {
		talk: talks[id] || (talks[id] = { slug, title, thumb, duration, link, id, video, data }),
		payload, policy, ...others
	}
}

function getLongMemoryTalk(talk, $talks){
	const id=`${talk.slug}-longmemory`
	return $talks[id]||($talks[id]={id, slug:talk.slug, title:`${talk.slug} Long Memory`, data:[]})
}

function clearPolicyHistory({ talk, policy: policyName }) {
	const talkPolicy=talk[policyName]
	if(talkPolicy){
		delete talkPolicy.challenges;
		delete talkPolicy.records;
		delete talkPolicy.history;
		talkPolicy.fullscreen=false
		talkPolicy.challenging=0

		FileSystem.deleteAsync(`${FileSystem.documentDirectory}${talk.id}/${policyName}`, { idempotent: true });
	}
}

/**
 * talk/book : {id}, others {talk}
 * @param {*} talks 
 * @param {*} action 
 * @returns 
 */
export default function talks(talks = {}, action) {
	switch (action.type) {
		// case "persist/REHYDRATE":{
		// 	Object.values(action.payload.talks).forEach(talk=>{
		// 		if(talk.languages){
		// 			talk.transcript=talk.languages.mine?.transcript
		// 			delete talk.languages
		// 		}
		// 	})
		// 	return action.payload.talks
		// }
		case "lang/PERSIST":
			return talks;
		case "lang/REHYDRATE":
			return action.payload.talks;
		case "talk/set":
			return produce(talks, $talks => {
				$talks[action.talk.id] = { ...$talks[action.talk.id], ...action.talk };
			});
		case "talk/parentControl":
			return produce(talks, $talks=>{
				const { talk, policyName, controled } = getTalk(action, $talks)
				const current=talk[policyName]||(talk[policyName]={})
				current.parentControled=controled
			})
		case "talk/parentControl/remove":
			return produce(talks, $talks=>{
				const { talk, policyName } = getTalk(action, $talks)
				const current=talk[policyName]||(talk[policyName]={})
				delete current.parentControled
			})
		case "talk/toggle/favorited":
			return produce(talks, $talks => {
				const { talk } = getTalk(action, $talks);
				talk.favorited = !!!talk.favorited;
			});
		case "talk/toggle/challenging":
			return produce(talks, $talks => {
				checkAction(action, ["policy"]);
				const { talk, policy } = getTalk(action, $talks);
				const talkPolicy = talk[policy] || (talk[policy] = {});

				delete talkPolicy.history;

				const challenges = talkPolicy.challenges || (talkPolicy.challenges = []);
				for (let i = challenges.length - 1; i > -1; i--) {
					if (challenges[i].pass) {
						challenges.splice(i, 1);
					}
				}

				if (!!challenges.length) {
					if (!talkPolicy.challenging && talkPolicy.challenging != 0) {
						talkPolicy.challenging = 0;
					}
					talkPolicy.challenging++;
					//record history, challenge++
					const Widget = globalThis.Widgets[talk.slug];
					challenges.forEach(cue => {
						const item = talk.data.find(a => Widget.cueEqualData(cue, a));
						if (item) {
							if (item.challenged == undefined) {
								item.challenged = 0;
							}
							item.challenged++;
						}
					});
				} else {
					if (talkPolicy.challenged == undefined) {
						talkPolicy.challenged = 0;
					}
					talkPolicy.challenged++;
					clearPolicyHistory({talk, policy})
				}
			});
		case "talk/policy/history":
			if(!(action.talk.id in talks)){
				return talks
			}
		case "talk/policy":
			return produce(talks, $talks => {
				checkAction(action, ["payload"]);
				const { talk, payload, target = "general", } = getTalk(action, $talks);
				if (talk[target]?.challenging) {
					delete payload.chunk;
				}
				talk[target] = { ...talk[target], ...payload };
			});
		
		case "talk/challenge/remove":
			return produce(talks, $talks => {
				checkAction(action, ["chunk", "policy"]);
				const { talk, policy = "general", chunk } = getTalk(action, $talks);

				const { challenges = [] } = talk[policy] || (talk[policy] = {});
				talk[policy].challenges = challenges;
				const i = challenges.findIndex(a => a.time == chunk.time);
				if (i !== -1) {
					challenges.splice(i, 1);
				}
				if (challenges.length == 0) {
					clearPolicyHistory({ talk, policy });
				}
			});
		case "talk/challenge/toggle":
			return produce(talks, $talks => {
				checkAction(action, ["chunk","policy"]);
				const { talk, policy:policyName = "general", chunk } = getTalk(action, $talks);
				const current = (talk[policyName] || (talk[policyName] = {}));
				const challenges = (current.challenges || (current.challenges = []));

				const i = challenges.findIndex(a => a.time == chunk.time);
				if(current.challenging){
					if(i!=-1){
						challenges[i].pass=true
					}
				}else{
					if(i!=-1){
						challenges.splice(i,1)
					}else{
						challenges.push(chunk)
						challenges.sort((a,b)=>a.time-b.time)
					}
				}
			});
		case "talk/challenge/shuffle":
			return produce(talks, $talks=>{
				const { talk, policyName, challenges } = getTalk(action, $talks)
				clearPolicyHistory({talk, policy:policyName})
				const current=talk[policyName]||(talk[policyName]={})
				current.challenges=challenges
				current.challenging=1
			})
		case "talk/chanllenge/longmemory":
			return produce(talks, $talks=>{
				const { talk, policyName } = getTalk(action, $talks)
				const longMemoryTalk=getLongMemoryTalk(talk, $talks)
				const data=longMemoryTalk.data||(longMemoryTalk.data=[])
				const Widget=globalThis.Widgets[talk.slug]
				const current=talk[policyName]||(talk[policyName]={})
				const currentLeft=(current.challenges||[])
					.map(cue=>talk.data.find(data=>Widget.cueEqualData?.(cue,data))).filter(a=>!!a)//cue -> data
					.filter(({word,text:a=word})=>!data.find(({word:$1,text:b=$1})=>a==b))//filter out existing
				
				data.splice(data.length, 0, ...(Widget.onLongMemoryData ?  Widget.onLongMemoryData(currentLeft, talk) : currentLeft))
				clearPolicyHistory({talk, policy:policyName})
			})
		case "talk/chanllenge/longmemory/sentence":
			return produce(talks, $talks=>{
				const { talk, chunk, policyName} = getTalk(action, $talks)
				const longMemoryTalk=getLongMemoryTalk(talk, $talks)
				const data=longMemoryTalk.data||(longMemoryTalk.data=[])
				data.push(chunk)
				clearPolicyHistory({talk, policy:policyName})
			})
		case "talk/recording":
			return produce(talks, $talks => {
				checkAction(action, ["record", "policy", "chunk"]);
				const { talk, policy, policyName, record, chunk } = getTalk(action, $talks);
				const current = (talk[policyName] || (talk[policyName] = {}));
				//current.history=chunk.time

				const score = diffScore(chunk.test || chunk.text, record.recognized, record); (() => {
					if (policy.autoChallenge) {
						const challenges = (current.challenges || (current.challenges = []));
						if (score < policy.autoChallenge) {
							if (!current.challenging) {
								const i=challenges.findIndex(a => a.time == chunk.time)
								if (-1 == i) {
									challenges.push(chunk);
								}else {
									challenges.splice(i,1)
								}
							}
						} else {
							record.pass=true
							if (current.challenging) {
								const challenge = challenges.find(a => a.time == chunk.time);
								if (challenge) {
									challenge.pass = true;
								}
							}
						}
					}
				})();

				//2. save recognized to records
				; (() => {
					if (record.recognized && policy.record) {
						const records = (current.records || (current.records = {}));
						records[`${chunk.time}-${chunk.end}`] = record;
						records.changed = Date.now();
					}
				})();


			});
		////unify : id, uri
		case "talk/book/record":
			return produce(talks, $talks => {
				const { type, id, talk: talk0, ...record } = action;
				let talk = $talks[id];
				if (!talk && talk0) {
					talk = $talks[id] = { data: [], ...talk0 };
				}

				talk.data.push(record);
			});
		case "talk/book/remove":
			return produce(talks, $talks => {
				const { id, uri } = action;
				const talk = $talks[id];
				const i = talk.data.findIndex(a => a.uri == uri);
				if (i != -1) {
					talk.data.splice(i, 1);
				}
			});
		case "talk/book/remove/index":
			return produce(talks, $talks => {
				const { id, index: i } = action;
				const talk = $talks[id];
				if (i != -1) {
					talk.data.splice(i, 1);
				}
			});
		case "talk/book/add":
			return produce(talks, $talks => {
				const { id, appending } = action;
				if (appending.length > 0) {
					const talk = $talks[id];
					talk.data = [...talk.data, ...appending];
				}
			});
		case "talk/book/set":
			return produce(talks, $talks => {
				const { id, uri, type, ...props } = action;
				const talk = $talks[id];
				const item = talk.data.find(a => a.uri == uri);
				if (item) {
					Object.assign(item, props);
				}
			});
		case "talk/book/replace":
			return produce(talks, $talks => {
				const { id, i, appending } = action;
				if (appending.length > 0) {
					const talk = $talks[id];
					talk.data.splice(i, 1, ...appending);
				}
			});
		/////////
		case "talk/clear/history":
			return produce(talks, $talks => {
				const {talk}=getTalk(action, $talks)
				Object.keys(Policy).forEach(policy => clearPolicyHistory({ talk, policy }))
			});
		case "talk/clear/policy/history":
			return produce(talks, $talks => {
				const {talk, policy}=getTalk(action, $talks)
				clearPolicyHistory({ talk, policy });
			});
		case "talk/clear":
			return produce(talks, $talks => {
				const talk = $talks[action.id];
				if (talk) {
					const clear = a => {
						FileSystem.deleteAsync(`${FileSystem.documentDirectory}${a.id}`, { idempotent: true });
						delete $talks[a.id];
					};
					clear(talk);
					const Widget = globalThis.Widgets[talk.slug];

					if (Widget && talk.id == talk.slug) {
						Object.values($talks).forEach(a => {
							if (a.slug == talk.slug) {
								clear(a);
							}
						});
					}
				}
			});
		case "talk/clear/all": {
			return produce(talks, $talks => {
				const clear = a => {
					FileSystem.deleteAsync(`${FileSystem.documentDirectory}${a.id}`, { idempotent: true });
					delete $talks[a.id];
				};
				Object.values($talks).forEach(clear);
			});
		}
		case "talk/split":{//only for vocabulary
			return produce(talks, $talks => {
				const id=action.talk.id
				const {general, shadowing, challenged, history, ...talk}=talks[id]
				const number=action.number
				const len=Math.ceil(talk.data.length / number)
				if(len==1)
					return
				
				const data=[...talk.data]
				new Array(len).fill(0).map((a,i)=>{
					return data.splice(0,number)
				}).forEach((a,i)=>{
					const newTalk={
						...talk, 
						id:`${talk.id}-${i+1}`, 
						title:`${talk.title}-${i+1}`, 
						data:a
					}
					$talks[newTalk.id]=newTalk
				})
			})
		}

	}
	return talks;
}


export const listeners=[
	{
		type: "talk/recording",
		async effect(action, api) {
			const {talk, record, policyName}=getTalk(action, api.getOriginalState().talks)
			if(record.pass){
				globalThis.sounds.pop()
			}
			if(action.isLastChunk){
				api.dispatch({type:"talk/toggle/challenging", talk:{id:talk.id}, policy:policyName})
			}
		}
	},
	{
		type: "talk/remote/favorited",
		async effect(action, { getState, dispatch }) {
			const state = getState();
			const { id, favorited, ...talk } = state.talks[action.talk.id];
			if (!favorited || talk.slug == id)
				return;

			if (!(await isAdmin(state)))
				return;

			try {
				const unwrap = (({ general, shadowing, retelling, dictating, challenging, ...talk }) => talk)(talk);
				(globalThis.Widgets[talk.slug] || globalThis.TedTalk).onFavorite?.({ id, talk: { ...unwrap, _id: id }, state, dispatch });
			} catch (e) {
				FlyMessage(e.message);
			}
		}
	},
	{
		type: "talk/toggle/challenging",
		async effect({ talk: { id }, policy }, api) {
			try {
				const getTalkPolicy = state => state.talks[id][policy] || {};
				const state = api.getState();
				const talk = state.talks[id];
				const lastTalkPolicy = getTalkPolicy(api.getOriginalState());
				const talkPolicy = getTalkPolicy(state);
				if (!lastTalkPolicy.challenging && !talkPolicy.challenging) { //pass all at first run
					//@Todo: play
					globalThis.sounds.celebrate()
					FlyMessage.show(l10n[`Congratulations! All ${talk.data.length} passed with only 1 go`]);
					api.dispatch({type:'today/plan/check', id, policy, complete:true})
				} else if (!lastTalkPolicy.challenging && talkPolicy.challenging) { //start
					FlyMessage.show(l10n[`${talkPolicy.challenges.length} left`]);
				} else if (lastTalkPolicy.challenging && !talkPolicy.challenging) { //complete
					//@Todo: play
					globalThis.sounds.celebrate()
					FlyMessage.show(l10n[`Congratulations! All ${talk.data.length} passed with ${lastTalkPolicy.challenging} tries!`]);
					api.dispatch({type:'today/plan/check', id, policy, complete:true})

				} else { //in progress
					const passed=lastTalkPolicy.challenges.length - talkPolicy.challenges.length
					if(passed){
						FlyMessage.show(l10n[`${passed} more passed`]);
					}
					api.dispatch({type:'today/plan/check', id, policy})
				}
			} catch (e) {
			}
		}
	},
	{
		type:"today/plan/check",
		async effect({id, policy, complete, togglePlaying, challenging}, api){
			const state=api.getState()
			let {plan:{today:original}, talks}=state
			const changed=produce(original||{}, today=>{
				if(!today?.day || new Date().asDateString()!=today.day){
					//create today plan 
					const day=new Date()
					today.tasks=selectPlansByDay(state, day),
					today.day=day.asDateString()
				}
	
				if(togglePlaying===true){// case 1: from UI action
					today.playing=today.playing ? false : Date.now()
				}else if(id && policy){// case 2: from toggle challenging
					const policyTalk=talks[id][policy]
					const plan=today.tasks.find(a=>a.plan.id==id && a.plan.policy==policy && !a.complete)
	
					if(plan){
						if(complete){
							plan.complete=true
						}else{
							// if(policyTalk.challenging>5){
							// 	plan.complete=policyTalk.challenging
							// }
						}
					}else {//corner case: change playing to trigger next in case talk has already completed 
						if(today.tasks.find(a=>!a.complete)){
							if(today.playing){
								today.playing=Date.now()
							}
						}
					}
				}
			})

			if(changed!=original){
				api.dispatch({type:"today/plan", today:changed})
			}
		}
	}
]
