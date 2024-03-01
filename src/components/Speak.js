import React from 'react';
import { useSelector } from "react-redux";
import * as Speech from "./speech";
import lock from "./lock";

export default Object.assign(({ text, children = null, locale, onStart, onEnd }) => {
    const { mylang, tts = {} } = useSelector(state => state.my);
    React.useEffect(() => {
        (async (startAt) => {
            console.debug("begin to speak " + text);
            await lock.runExclusive(async () => {
                try {
                    onStart?.();
                    await Speech.speak(text, locale && tts[mylang] ? { iosVoiceId: tts[mylang] } : {});
                } catch (e) {
                    console.error(e);
                } finally {
                    onEnd?.(Date.now() - startAt);
                }
            });
        })(Date.now());
        return () => Speech.stop();
    }, []);
    return children;
}, {
    setDefaults() {
        Speech.setDefaults(...arguments);
    },
    stop() {
        Speech.stop();
    },
    speak() {
        return Speech.speak(...arguments);
    }
});
