import React from 'react';
import { View, ActivityIndicator } from "react-native";
import { ColorScheme } from 'react-native-use-qili/components/default-style';
import { PlayButton } from '..';
import { PressableIcon } from './index';



export function NavBar({ dispatch, status = {}, controls = {}, isChallenged, navable, style, size = 24, ...props }) {
    const color = React.useContext(ColorScheme);
    const containerStyle = { width: "100%", flexDirection: "row", alignItems: "center", alignSelf: "center", justifyContent: "space-around", margin: "auto" };
    return (
        <View style={[containerStyle, style]} {...props}>
            {status.isLoaded && (<>
                <PressableIcon size={size} testID="slow"
                    disabled={!navable || controls.slow == false}
                    name={controls.slow == false ? "" : (status.whitespacing ? "replay-5" : "subdirectory-arrow-left")}
                    onPress={e => dispatch({ type: `nav/${status.whitespacing ? "replay" : "prev"}Slow` })} />
                <PressableIcon size={size} testID="prev"
                    disabled={!navable || controls.prev == false}
                    name={controls.prev == false ? "" : (status.whitespacing ? "replay" : "keyboard-arrow-left")}
                    onPress={e => dispatch({ type: `nav/${status.whitespacing ? "replay" : "prev"}` })} />

                <PlayButton size={size} testID="play"
                    whitespacing={status.whitespace}
                    disabled={status.whitespacing || controls.play === false}
                    color={status.whitespacing ? color.warn : "white"}
                    name={status.whitespacing ? "fiber-manual-record" : (status.isPlaying ? "pause" : "play-arrow")}
                    onPress={e => dispatch({ type: "nav/play" })} />

                <PressableIcon size={size} testID="next"
                    disabled={!navable || controls.next == false}
                    name={controls.next == false ? "" : "keyboard-arrow-right"}
                    onPress={e => dispatch({ type: "nav/next" })} />

                <PressableIcon size={size} testID="check"
                    disabled={!navable || controls.select == false}
                    name={controls.select == false ? "" : (isChallenged ? "alarm-on" : "alarm-add")}
                    onPress={e => dispatch({ type: "nav/challenge" })}
                    color={isChallenged ? "yellow" : undefined} />
            </>)}
            {!status?.isLoaded && <ActivityIndicator size="large" />}
        </View>
    );
}
