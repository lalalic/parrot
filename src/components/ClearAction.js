import React from 'react';
import { useDispatch } from "react-redux";
import { Context as PlayerContext } from "./player";
import PressableIcon from "react-native-use-qili/components/PressableIcon";

export default function ClearAction({ talk, policyName }) {
    const dispatch = useDispatch();
    const { firePlayerEvent } = React.useContext(PlayerContext);
    return (
        <PressableIcon name="delete-sweep"
            onLongPress={e => {
                dispatch({ type: `talk/clear/policy`, talk });
                firePlayerEvent(`nav/reset`);
            }}
            onPress={e => {
                dispatch({ type: "talk/clear/policy/history", talk, policy: policyName });
                firePlayerEvent("nav/reset");
            }} />
    );
}
