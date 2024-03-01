import React from 'react';
import { Animated, Easing } from "react-native";
import SliderIcon from './SliderIcon';


export default function AutoHide({ hide: indicatorOrCallbackRef, style, children, timeout = 2000, duration = 6000, ...props }) {
    const { sliding } = React.useContext(SliderIcon.Context);
    const opacity = React.useRef(new Animated.Value(1)).current;
    const opacityTimeout = React.useRef();

    const [hide, setHide] = React.useState(false);

    React.useEffect(() => {
        if (typeof (indicatorOrCallbackRef) == "object") {
            indicatorOrCallbackRef.current = setHide;
        } else {
            setHide(indicatorOrCallbackRef);
        }
    }, [indicatorOrCallbackRef]);

    React.useEffect(() => {
        if (opacityTimeout.current) {
            clearTimeout(opacityTimeout.current);
            opacityTimeout.current = null;
        }
        opacity.setValue(1);
        if (sliding || hide === false) {
            return;
        }
        let timing = null;
        const timeout = opacityTimeout.current = setTimeout(() => {
            opacityTimeout.current = null;
            opacity.setValue(1);
            (timing = Animated.timing(opacity, {
                toValue: 0,
                duration,
                easing: Easing.linear,
                useNativeDriver: true,
            })).start();
        }, hide - Date.now() + 2000);
        return () => {
            clearTimeout(timeout);
            timing && timing.stop();
        };
    }, [hide, !!sliding]);

    return (
        <Animated.View style={[style, { opacity }]} {...props}>
            {children}
        </Animated.View>
    );
}
