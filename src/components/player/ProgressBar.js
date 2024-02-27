import React from 'react';
import { View, Text } from "react-native";
import Slider from '@react-native-community/slider';



export function ProgressBar({ value: initValue = 0, duration = 0, style, onValueChange, onProgress, onSlidingComplete, onSlidingStart, ...props }) {
    const [value, setValue] = React.useState(initValue);
    React.useEffect(() => {
        onProgress.current = setValue;
    }, []);
    return (
        <View style={[{ flex: 1, flexDirection: "row" }, style]} {...props}>
            <View style={{ justifyContent: "center", width: 50 }}>
                <TimeText style={{ textAlign: "right", }} time={value} />
            </View>
            <View style={{ justifyContent: "center", flexGrow: 1 }}>
                <Slider {...{ style: { flexGrow: 1 }, thumbTintColor: "transparent", onValueChange, onSlidingComplete, onSlidingStart, value, maximumValue: duration }} />
            </View>
            <View style={{ justifyContent: "center", width: 50, }}>
                <TimeText style={{}} time={(duration - value)} />
            </View>
        </View>
    );
}
const TimeText = ({ time, ...props }) => {
    const text = ((m = 0, b = m / 1000, a = v => String(Math.floor(v)).padStart(2, '0')) => `${a(b / 60)}:${a(b % 60)}`)(time);
    const [m, s] = text.split(":");
    const textStyle = { width: 20 };
    return (
        <Text {...props}>
            <Text style={textStyle}>{m}</Text><Text>:</Text>
            <Text style={textStyle}>{s}</Text>
        </Text>
    );
};
