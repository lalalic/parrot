import React from 'react';
import { View, Text, Pressable, FlatList } from "react-native";
import { useSelector } from "react-redux";
import * as FileSystem from "expo-file-system";
import { ColorScheme } from 'react-native-use-qili/components/default-style';
import { diffPretty } from '../../experiment/diff';
import { Recognizer, PlaySound } from '..';
import { Context, PressableIcon } from './index';


export function Subtitles({ style, policy, itemHeight: height = 80, ...props }) {
    const { status, i = status.i, chunks, setShowSubtitle } = React.useContext(Context);
    const shouldCaption = policy == "shadowing";
    const subtitleRef = React.useRef();
    React.useEffect(() => {
        if (chunks && subtitleRef.current) {
            if (i >= 0 && i < chunks.length - 1) {
                subtitleRef.current.scrollToIndex({ index: i, viewPosition: 0.5 });
            }
        }
    }, [i]);

    React.useEffect(() => {
        setShowSubtitle(false);
        return () => setShowSubtitle(true);
    }, []);

    return (
        <View {...props} style={[{ padding: 4 }, style]}>
            <FlatList data={chunks}
                ref={subtitleRef}
                estimatedItemSize={height}
                getItemLayout={(data, index) => ({ length: height, offset: index * height, index })}
                keyExtractor={({ text, test }, i) => `${text}-${test}-${i}`}
                renderItem={({ index, item }) => <SubtitleItem {...{ style: { height }, shouldCaption, index, item, }} />} />
        </View>
    );
}
function SubtitleItem({ shouldCaption: $shouldCaption, index, item, style }) {
    const { id, dispatch, status, current = status.i, getRecordChunkUri, policyName, controls } = React.useContext(Context);
    const color = React.useContext(ColorScheme);
    const { recognized, diffs, score } = useSelector(state => {
        return state.talks[id]?.[policyName]?.records?.[`${item.time}-${item.end}`];
    }) || {};
    const isChallenged = useSelector(state => {
        const exist = state.talks[id]?.[policyName]?.challenges?.find(a => a.time == item.time);
        return exist && !exist.pass;
    });
    const audio = getRecordChunkUri?.(item);

    const [playing, setPlaying] = React.useState(false);
    const [audioExists, setAudioExists] = React.useState(false);
    React.useEffect(() => {
        if (audio && recognized) {
            (async () => {
                const info = await FileSystem.getInfoAsync(audio);
                if (info.exists) {
                    setAudioExists(true);
                }
            })();
        }
    }, [recognized, audio]);
    const textProps = {
        style: { flexGrow: 1, paddingLeft: 10, },
        adjustsFontSizeToFit: true,
        numberOfLines: 2,
    };

    const [shouldCaption, setShouldCaption] = React.useState($shouldCaption);

    return (
        <View style={{
            backgroundColor: index == current ? color.inactive : undefined,
            flexDirection: "row", borderColor: "gray", borderTopWidth: 1, paddingBottom: 5, paddingTop: 5, ...style
        }}>
            <View style={{ width: 22, justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ textAlign: "center", fontSize: 10 }}>{index + 1}</Text>
                {controls.select != false && <PressableIcon size={20} color={color.text}
                    onPress={e => dispatch({ type: "nav/challenge", i: index })}
                    name={isChallenged ? "alarm-on" : "radio-button-unchecked"} />}
                <Text style={{ textAlign: "center", fontSize: 10 }}>{score || ""}</Text>
            </View>
            <View style={{ flex: 1, flexGrow: 1 }}>
                <Pressable style={{ flex: 1 }}
                    onPressOut={e => !$shouldCaption && setShouldCaption(false)}
                    onLongPress={e => !$shouldCaption && setShouldCaption(true)}
                    onPress={e => dispatch({ type: "media/time", time: item.time, shouldPlay: true })}>
                    <Text {...textProps}>{shouldCaption ? item.text : ""}</Text>
                </Pressable>
                <Pressable style={{ flex: 1, justifyContent: "flex-end", }}
                    onPress={e => {
                        if (!audioExists)
                            return;
                        dispatch({
                            type: "nav/pause", callback: () => {
                                debugger;
                                setPlaying(true);
                            }
                        });
                    }}>
                    <Recognizer.Text
                        key={recognized}
                        id={item.text}
                        {...textProps}
                        style={{
                            ...textProps.style,
                            color: playing ? color.primary : color.text
                        }}
                        children={diffPretty(diffs)} />
                    {!!playing && !!audio && <PlaySound audio={audio} onEnd={e => setPlaying(false)} />}
                </Pressable>
            </View>
        </View>
    );
}
