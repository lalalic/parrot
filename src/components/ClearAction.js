import React from 'react';
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-native";
import { Context as PlayerContext } from "./player";
import PressableIcon from "react-native-use-qili/components/PressableIcon";

export default function ClearAction({ talk, policyName }) {
    const dispatch = useDispatch();
    const navigate = useNavigate()
    const { firePlayerEvent } = React.useContext(PlayerContext);
    return (
        <PressableIcon name="delete-sweep"
            onLongPress={e => {
                navigate('/home')
                dispatch({ type: `talk/clear`, id:talk.id });
            }}
            onPress={e => {
                dispatch({ type: "talk/clear/policy/history", talk, policy: policyName });
                firePlayerEvent("nav/reset");
            }} />
    );
}
