import { isAdmin } from "react-native-use-qili/store";
import FlyMessage from "react-native-use-qili/components/FlyMessage";

export const listeners = [
	{
		type: "talk/toggle/favorited",
		async effect(action, { getState, dispatch }) {
			const state = getState();
			const { id, favorited, ...talk } = state.talks[action.talk.id];
			if (!favorited || talk.slug == id)
				return;

			if (!(await isAdmin(state)))
				return;

			try {
				const unwrap = (({ general, shadowing, retelling, dictating, challenging, ...talk }) => talk)(talk);
				// if((globalThis.Widgets[talk.slug]||globalThis.TedTalk).onFavorite){
				// 	dispatch({type:"favorite/queue", talk:{...unwrap,_id:id}})
				// }
				; (globalThis.Widgets[talk.slug] || globalThis.TedTalk).onFavorite?.({ id, talk: { ...unwrap, _id: id }, state, dispatch });
			} catch (e) {
				dispatch({ type: "message/error", message: e.message });
			}
		}
	}, 
	{
		type: "talk/toggle/challenging",
		async effect({ table: { id }, policy }, api) {
			try {
				const getTalkPolicy = state => state.talks[id][policy] || {};
				const state = api.getState();
				const talk = state.talks[id];
				const lastTalkPolicy = getTalkPolicy(api.getOriginalState());
				const talkPolicy = getTalkPolicy(state);
				if (!lastTalkPolicy.challenging && !talkPolicy.challenging) { //pass all at first run
					//@Todo: play
					FlyMessage.show(`Congratulations! All ${talk.data.length} passed with only 1 go.`);
				} else if (!lastTalkPolicy.challenging && talkPolicy.challenging) { //start
					FlyMessage.show(`${passed > 5 ? `${passed} passed at first try. ` : ''} Keep up great work for left ${left}!`);
				} else if (lastTalkPolicy.challenging && !talkPolicy.challenging) { //complete
					//@Todo: play
					FlyMessage.show(`All ${talk.data.length} passed with ${lastTalkPolicy.challenging} tries!`);
				} else { //in progress
					FlyMessage.show(`${lastTalkPolicy.challenges.length - talkPolicy.challenges.length} more passed, keep great work for ${talkPolicy.challenges.length} more!`);
				}
			} catch (e) {
			}
		}
	}, {
		type: "talk/recording",
		async effect(action, api) {
			const state = api.getOriginalState();

			//challenging
			//first: 
		}
	}
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
];
