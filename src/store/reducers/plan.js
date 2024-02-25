import { produce } from "immer";
import { defaultMemoize } from "reselect";
import * as Calendar from "../../experiment/calendar";

function checkAction(action, keys) {
	const missing = keys.filter(a => !(a in action));
	if (missing.length > 0) {
		throw new Error(`plan action[${action.type}] miss keys[${missing.join(",")}]`);
	}
	return true;
}

export default function plan(plans = {}, action) {
	switch (action.type) {
		case "lang/PERSIST":
			return plans;
		case "lang/REHYDRATE":
			return action.payload.plan;
		case "persist/REHYDRATE": {
			const { plan = {} } = action.payload || {};
			return {
				...plans,
				...JSON.parse(JSON.stringify(plan), (key, value) => {
					switch (key) {
						case "start":
						case "end":
							return new Date(value)
					}
					return value;
				})
			};
		}
		case "plan/calendar":
			return produce(plans, plans => {
				plans.calendar = action.id;
			});
		case "plan/events":
			return produce(plans, plans => {
				action.events.forEach(({ start, eventID }) => {
					const [y, w, d, h] = [start.getFullYear(), start.getWeek(), start.getDay(), Math.floor(start.getHalfHour())];
					plans[y][w][d][h].eventID = eventID;
				});
			});
		case "plan": {
			const { plan: { start } } = action;
			checkAction(action, ["plan"]);
			const [y, w, d, h] = [start.getFullYear(), start.getWeek(), start.getDay(), Math.floor(start.getHalfHour())];
			Calendar.createEvents(store, action.plan, plans[y]?.[w]?.[d]?.[h]);
			return immutableSet(plans, [y, w, d, h], action.plan);
		}
		case "plan/remove": {
			const { time: start } = action;
			checkAction(action, ["time"]);
			const [y, w, d, h] = [start.getFullYear(), start.getWeek(), start.getDay(), Math.floor(start.getHalfHour())];
			Calendar.deleteEvents(plans[y]?.[w]?.[d]?.[h]);
			const removed = immutableSet(plans, [y, w, d, h], null);
			return removed || {};
		}
		case "plan/clear":
			return { calendar: plans.calendar };
		case "plan/copy/1": {
			checkAction(action, ["replacements", "day", "templateDay"]);
			const { replacements, day, templateDay } = action;
			const template = plans[templateDay.getFullYear()][templateDay.getWeek()][templateDay.getDay()];
			const plan = JSON.parse(JSON.stringify(template), (key, value) => {
				switch (key) {
					case "start":
						return new Date(value).switchDay(day);
					case "id":
						return replacements[value] || value;
				}
				return value;
			});
			const [y, w, d] = [day.getFullYear(), day.getWeek(), day.getDay()];
			Calendar.createEvents(store, plan, plans[y]?.[w]?.[d]);
			return immutableSet(plans, [y, w, d], plan);
		}
		case "plan/copy/7": {
			checkAction(action, ["replacements", "day", "templateDay"]);

			const { replacements, day, templateDay } = action;
			const template = plans[templateDay.getFullYear()][templateDay.getWeek()];
			const plan = JSON.parse(JSON.stringify(template), (key, value) => {
				switch (key) {
					case "start":
						return new Date(value).switchWeek(day);
					case "id":
						return replacements[value] || value;
				}
				return value;
			});
			const [y, w] = [day.getFullYear(), day.getWeek()];
			Calendar.createEvents(store, plan, plans[y]?.[w]);
			return immutableSet(plans, [y, w], plan);
		}
		case "today/plan":
			return produce(plans, $plans=>{
				$plans.today=action.today
			})
	}
	return plans;
}
function nullClear(o, key, returnEmpty) {
	o = { ...o };
	delete o[key];
	if (returnEmpty)
		return o;
	return Object.keys(o).length == 0 ? null : o;
}
function immutableSet(o, keys, value, returnEmpty = true) {
	if (keys.length == 1) {
		return value === null ? nullClear(o, keys[0], returnEmpty) : { ...o, [keys[0]]: value };
	}
	const first = keys.shift();
	const firstValue = immutableSet({ ...o[first] }, keys, value, false);
	return firstValue === null ? nullClear(o, first, returnEmpty) : { ...o, [first]: firstValue };
}

const dayEvents=defaultMemoize(events=>{
	if (!events)
		return [];
	return Object.values(events).filter(a=>!!a).map(plan => {
		return {
			start: plan.start.asDateTimeString(),
			end: new Date(plan.start.getTime() + plan.coures * 30 * 60 * 1000).asDateTimeString(),
			plan,
		};
	}).sort((a,b)=>a.plan.start.getTime()-b.plan.start.getTime());
})

export function selectPlansByDay(state,day){
	return dayEvents(state.plan?.[day.getFullYear()]?.[day.getWeek()]?.[day.getDay()])
}
