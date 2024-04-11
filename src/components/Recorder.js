import React from 'react';
import { View, Modal, useWindowDimensions } from "react-native";
import PressableIcon from "react-native-use-qili/components/PressableIcon";
import Recognizer from './Recognizer';


export default function Recorder({ style, name = "mic", size = 40, color: _color, onRecordUri, onRecord, onText = onRecord, onCancel, recording = false, _initState = { recording, active: "audio" }, children = <PressableIcon size={size} name={name} color={_color} />, ...props }) {

    const [state, setState] = React.useState(_initState);
    const { width, height } = useWindowDimensions();

    return (
        <View style={[{ alignItems: "center", justifyContent: "center", flexDirection: "column" }, style]}
            pointerEvents="box-only"
            onStartShouldSetResponder={e => {
                setState(state => ({ ...state, recording: true }));
                return true;
            }}
            onMoveShouldSetResponder={e => true}
            onResponderMove={e => {
                const { pageX: x, pageY: y } = e.nativeEvent;
                setState(state => ({ ...state, active: y > height - 70 ? "audio" : (x <= width / 2 ? "cancel" : "text") }));
            }}
            onResponderRelease={e => setState(state => ({ ...state, recording: false }))}
        >
            {children}
            <Modal visible={state.recording} transparent={true}>
                <View style={{ flex: 1, flexDirection: "column", backgroundColor: "rgba(128,128,128,0.8)" }}>
                    <View style={{ flex: 1 }} />
                    <View style={{ height: 50, margin: 10, alignItems: "center", flexDirection: "column" }}>
                        <Recognizer.Text style={{ textAlign: "center", backgroundColor: "green", padding: 2, borderRadius: 5, width: 200, height: state.active == "text" ? 50 : 0 }} />
                        {state.active !== "text" && <Recognizer.Wave barWidth={3} style={{ flex: 1, borderRadius: 5 }} />}
                    </View>
                    <View style={{ height: 100, flexDirection: "row" }}>

                        <PressableIcon style={{ flex: 1 }} name="cancel"
                            size={state.active == "cancel" ? 60 : 40}
                            color={state.active == "cancel" ? "red" : "white"} />

                        <PressableIcon style={{ flex: 1 }} name="textsms"
                            size={state.active == "text" ? 60 : 40}
                            color={state.active == "text" ? "red" : "white"} />
                    </View>
                    <PressableIcon name="multitrack-audio" size={40}
                        style={{ height: 100, backgroundColor: state.active == "audio" ? "lightgray" : "transparent" }} />
                </View>
            </Modal>
            {state.recording && <Recognizer
                uri={onRecordUri?.()}
                {...props}
                style={{ position: "absolute" }}
                onRecord={record => {
                    if (record.recognized) {
                        switch (state.active) {
                            case "text":
                                onText?.(record);
                                break;
                            case "audio":
                                onRecord?.(record);
                                break;
                            default:
                                onCancel?.(record);
                        }
                    }
                    setState(_initState);
                }} />}
        </View>
    );
}
