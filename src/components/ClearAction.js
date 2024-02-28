import React from 'react';
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-native";
import PlayerContext  from "./player/Context";
import PressableIcon from "react-native-use-qili/components/PressableIcon";

export default function ClearAction({ talk, policyName }) {
    const dispatch = useDispatch();
    const navigate = useNavigate()
    const { firePlayerEvent } = React.useContext(PlayerContext);
    return (
        <PressableIcon name="delete-sweep"
            onLongPress={e => {
                dispatch({ type: `talk/clear`, id:talk.id });
                navigate('/home')
            }}
            onPress={e => {
                dispatch({ type: "talk/clear/policy/history", talk, policy: policyName });
                firePlayerEvent("nav/reset");
            }} />
    );
}
