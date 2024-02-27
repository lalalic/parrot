import { useSelector } from "react-redux";

export default function useCheckChallenged({ id, chunk, policyName }) {
    return useSelector(state => {
        const exist = state.talks[id]?.[policyName]?.challenges?.find(a => a.time == chunk?.time);
        return exist && !exist.pass;
    });
}
