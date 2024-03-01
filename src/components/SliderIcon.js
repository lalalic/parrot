import React from 'react';
import { View, Text } from "react-native";
import PressableIcon from "react-native-use-qili/components/PressableIcon";


export default (uuid => {
    const Context = React.createContext({});

    function SliderIcon({ onToggle, onSlide, onSlideFinish, slider, icon, color = "gray", ...props }) {
        const [id] = React.useState(uuid++);
        const { setSliding, sliding } = React.useContext(Context);

        return (
            <PressableIcon onPress={onToggle} name={icon} color={color}
                onLongPress={e => setSliding({ id, onSlide, onSlideFinish, props: slider })}
                onPressOut={e => sliding?.id == id && !sliding.started && setSliding()}
                {...props} />
        );
    }

    const Slider = ({
        style: { width = 20, height = 150, left = 0, top = 40, ...style } = {}, minimumTrackTintColor = "blue", maximumTrackTintColor = "gray", minimumValue = 0, maximumValue = 100, step = 1, text = t => t, onValueChange, ...props
    }) => {
        const [value, setValue] = React.useState(props.value || 0);
        React.useEffect(() => {
            onValueChange.current = setValue;
        }, []);
        return (
            <View style={{ height, position: "absolute", left: 10, top, flexDirection: "row" }}>
                <View style={[{ width, height, backgroundColor: maximumTrackTintColor, borderRadius: 10, overflow: "hidden" }, style]}
                    {...props}>
                    <View style={{
                        width: "100%", backgroundColor: minimumTrackTintColor, position: "absolute",
                        height: (value - minimumValue) * height / (maximumValue - minimumValue)
                    }}>
                    </View>
                </View>
                <View style={{ justifyContent: "center" }}>
                    <Text style={{ backgroundColor: "black" }}>
                        {text(Number(value.toFixed(String(step).split(".")[1]?.length || 0)))}
                    </Text>
                </View>
            </View>
        );
    };

    SliderIcon.Container = ({ children, ...props }) => {
        const [sliding, setSliding] = React.useState(null);
        const onSlideRef = React.useRef(null);

        React.useEffect(() => {
            if (sliding) {
                const { style: { height = 150 } = {}, value = 0, minimumValue = 0, maximumValue = 100, step = 1 } = sliding.props;
                sliding.get = (dy = 0) => {
                    const v = Math.round((value + (maximumValue - minimumValue) / height * dy) / step) * step;
                    const n = Number(v.toFixed(String(step).split(".")[1]?.length || 0));
                    if (n < minimumValue)
                        return minimumValue;
                    if (n > maximumValue)
                        return maximumValue;
                    return n;
                };
            }
        }, [sliding]);

        return (
            <View
                onMoveShouldSetResponder={e => {
                    if (sliding) {
                        sliding.x0 = e.nativeEvent.pageX;
                        sliding.y0 = e.nativeEvent.pageY;
                        sliding.started = true;
                        return true;
                    }
                } }

                onResponderMove={e => {
                    if (sliding) {
                        const value = sliding.get(e.nativeEvent.pageY - sliding.y0);
                        onSlideRef.current?.(value);
                        sliding.onSlide?.(value);
                    }
                } }

                onResponderRelease={e => {
                    if (sliding) {
                        sliding.onSlideFinish?.(sliding.get(e.nativeEvent.pageY - sliding.y0));
                        setSliding(null);
                    }
                } }
                {...props}
            >
                <Context.Provider value={{ sliding, setSliding }}>
                    {children}
                </Context.Provider>
                {sliding && <Slider {...sliding.props} onValueChange={onSlideRef} />}
            </View>
        );
    };

    SliderIcon.Context = Context;
    return SliderIcon;
})(Date.now());
