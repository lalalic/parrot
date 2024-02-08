export default function history(state = {}, { type, ...history }) {
	switch (type) {
		case "lang/PERSIST":
			return {};
		case "history":
			return { ...state, ...history };
	}
	return state;
}
