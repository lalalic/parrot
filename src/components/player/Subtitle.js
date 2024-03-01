import React from 'react';
import { Text } from "react-native";
import { useSelector } from "react-redux";
import { diffPretty } from '../../experiment/diff';
import Delay from "../delay";
import Recognizer from "../Recognizer";



export function Subtitle({ delay, id, item, policyName, style, ...props }) {
    const { diffs } = useSelector(state => {
        return state.talks[id]?.[policyName]?.records?.[`${item?.time}-${item?.end}`];
    }) || {};
    return (
        <Text {...props} style={style}>
            {item && <Recognizer.Text key={item.text} id={item.text}>{diffPretty(diffs)}</Recognizer.Text>}
            {"\n"}
            <Delay seconds={delay}>
                {item?.text || ""}{"\n"}
            </Delay>
        </Text>
    );
}
