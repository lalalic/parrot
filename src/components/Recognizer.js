import React from 'react';
import { View, Text, DeviceEventEmitter } from "react-native";
import Voice from "@react-native-voice/voice";
import * as FileSystem from "expo-file-system";
import { useSelector } from "react-redux";
import { ColorScheme } from 'react-native-use-qili/components/default-style';
import lock from "./lock";


export default (() => {
    function Recognizer({ id, uri, text = "", onRecord, locale, style, autoSubmit, onAutoSubmit, onWave, ...props }) {
        const { lang, mylang } = useSelector(state => state.my);
        if (locale === true) {
            locale = mylang || "zh-CN";
        } else {
            locale = locale || lang || "en-US";
        }

        const autoSubmitHolder = React.useRef(null);
        const [recognized, setRecognizedText] = React.useState(text);
        const scheme = React.useContext(ColorScheme);

        React.useEffect(() => {
            let recognized, start, releaseLock;
            Voice.onSpeechResults = e => {
                clearTimeout(autoSubmitHolder.current);
                setRecognizedText(recognized = e?.value.join(""));
                DeviceEventEmitter.emit("recognized", [recognized, id]);
                autoSubmitHolder.current = setTimeout(() => {
                    onAutoSubmit?.({
                        recognized,
                        uri: `file://${audioUri}`,
                        duration: Date.now() - start
                    });
                }, autoSubmit);
            };
            Voice.onSpeechStart = e => {
                start = Date.now();
            };
            Voice.onSpeechEnd = e => {
            };
            Voice.onSpeechVolumeChanged = e => {
                DeviceEventEmitter.emit("wave", e.value, locale);
            };

            Voice.onSpeechError = e => {
                console.warn(`[Recognizer] - ${e.message}`);
            };
            const audioUri = uri?.replace("file://", ""); (async () => {
                if (audioUri) {
                    const folder = uri.substring(0, uri.lastIndexOf("/") + 1);
                    const info = await FileSystem.getInfoAsync(folder);
                    if (!info.exists) {
                        await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
                    }
                }
                releaseLock = await lock.acquire();
                Voice.start(locale, { audioUri });
            })();

            return async () => {
                try {
                    await Voice.stop();
                    await Voice.destroy();
                    if (recognized) {
                        DeviceEventEmitter.emit("recognized.done", [recognized, id, locale]);
                        onRecord?.({
                            lang: locale,
                            recognized,
                            uri: `file://${audioUri}`,
                            duration: Date.now() - start
                        });
                    } else {
                        onRecord?.({});
                    }
                } finally {
                    releaseLock?.();
                }
            };
        }, []);

        return !DeviceEventEmitter.listenerCount('recognized') && (
            <Text style={{ color: scheme.primary, ...style }} {...props}>
                {recognized || " "}
            </Text>
        );
    }

    Recognizer.Wave = ({ style, sampleAmount = 10, backgroundColor = "green", color = "black", barWidth = 2, barHeight = a => parseInt((a * 10 + 10) * 4 / 5) }) => {
        const [data] = React.useState((a = barHeight(0)) => new Array(sampleAmount).fill(a));
        const [changed, setChanged] = React.useState();
        React.useEffect(() => {
            DeviceEventEmitter.addListener('wave', value => {
                data.unshift(value);
                data.pop();
                setChanged(Date.now());
            });
        }, []);
        return (
            <View style={{ width: 200, paddingLeft: 50, paddingRight: 50, ...style, justifyContent: "space-around", backgroundColor, flexDirection: "row", alignItems: "center" }}>
                {data.map(barHeight).map((a, i) => <View key={i} style={{ backgroundColor: color, width: barWidth, height: `${a}%` }} />)}
            </View>
        );

    };

    Recognizer.Text = ({ children, id, style, onRecognizeEnd, ...props }) => {
        const [recognized, setRecognized] = React.useState(children);
        React.useEffect(() => {
            const recognizedListener = DeviceEventEmitter.addListener('recognized', ([recognized, recId]) => {
                if (id == recId) {
                    setRecognized(recognized);
                }
            });
            const doneListener = DeviceEventEmitter.addListener('recognized.done', ([recognized, recId]) => {
                if (id == recId) {
                    onRecognizeEnd?.(recognized);
                }
            });
            return () => {
                doneListener.remove();
                recognizedListener.remove();
            };
        }, []);

        return <Text style={style} {...props}>{recognized}</Text>;
    };

    return Recognizer;
})();
