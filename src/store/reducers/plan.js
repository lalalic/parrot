import { produce } from "immer";
import * as Calendar from "../../experiment/calendar";

export default function plan(plans = {}, action) {
	switch (action.type) {
		case "lang/PERSIST":
			return plans;
		case "lang/REHYDRATE":
			return action.payload.plan;
		case "persist/REHYDRATE": {
			const { plan: { calendar, ...lastPlans } = {} } = action.payload || {};
			return {
				...plans,
				calendar,
				...(function deep(a) {
					if (a.start) {
						a.start = new Date(a.start);
					} else {
						Object.values(a).forEach(deep);
					}
					return a;
				})(lastPlans)
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
