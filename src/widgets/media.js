import React from 'react';
import { View, Animated, Easing, Image } from "react-native";
import * as Speech from "expo-speech"


export class Media extends React.Component {
    static defaultProps = {
        isWidget: true,
        progressUpdateIntervalMillis: 100,
        positionMillis: 0,
    };

    constructor({ rate = 1, volume, positionMillis = 0 }) {
        super(...arguments);
        this.status = {
            isLoaded: true,
            didJustFinish: false,
            durationMillis: 0,
            positionMillis,
            rate,
            volume,
            isLoading: false,
            shouldPlay: false,
            isPlaying: false,
        };
        this.state = {};
    }

    shouldComponentUpdate(nextProps, state) {
        if (this.state !== state) {
            return true;
        }
        return false;
    }

    onPlaybackStatusUpdate(particular) {
        this.props.onPlaybackStatusUpdate?.({
            ...this.status,
            ...particular,
            positionMillis: this.progress.current,
        });
    }

    componentDidMount() {
        this.status.durationMillis = this.durationMillis;
        const { progressUpdateIntervalMillis, positionMillis = 0, shouldPlay } = this.props;
        this.progress = new Animated.Value(positionMillis);
        this.progress.current = 0;
        this.progress.last = 0;

        const eventHandler = ({ value }) => {
            if (value == 0)
                return;
            value = Math.floor(value);
            this.progress.current = value;
            if (this.progress.current - this.progress.last >= progressUpdateIntervalMillis) {
                this.progress.last = value;
                this.onPlaybackStatusUpdate();
            }
            this.playAt(value)
        };

        this.progress.addListener(eventHandler);

        this.setStatusAsync({ shouldPlay, positionMillis });

        this.onPlaybackStatusUpdate();
    }

    componentWillUnmount() {
        clearInterval(this.onPlaybackStatusUpdateInterval);
    }

    setStatusSync({ shouldPlay, positionMillis }) {
        if (positionMillis != undefined) {
            this.progress.last = Math.max(0, positionMillis - (this.progress.current - this.progress.last));
            this.progress.current = positionMillis;
        }

        if (shouldPlay != undefined) {
            if (shouldPlay != this.status.shouldPlay) {
                if (shouldPlay) {
                    this.status.shouldPlay = true;
                    this.status.isPlaying = true;
                    this.progress.setValue(this.progress.current);
                    this.progressing = Animated.timing(this.progress, {
                        toValue: this.status.durationMillis,
                        duration: this.status.durationMillis - this.progress.current,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    });
                    this.progressing.start(finished => {
                        if (finished) {
                            this.setState({ didJustFinish: true });
                            this.onPlaybackStatusUpdate({ isPlaying: false });
                            this.progress.setValue(0);
                            this.progress.current = 0;
                            this.progress.last = 0;
                            this.status.isPlaying = false;
                        }
                    });
                } else {
                    this.progressing?.stop();
                    this.status.isPlaying = false;
                    this.status.shouldPlay = false;
                    this.onPlaybackStatusUpdate();
                }
            }
        } else if (this.status.shouldPlay && positionMillis != undefined) {
            this.progressing.stop();
            this.status.shouldPlay = false;
            this.setStatusSync({ shouldPlay: true });
        }
    }

    setStatusAsync() {
        setTimeout(() => this.setStatusSync(...arguments), 0);
    }

    render() {
        const { isLoaded, positionMillis, isPlaying, rate, volume, durationMillis, didJustFinish } = this.status;
        const { thumb, posterSource = thumb, source, ...props } = this.props;

        return (
            <View {...props}>
                {!!posterSource && (<Image source={posterSource}
                    style={{ position: "absolute", width: "100%", height: "100%" }} />)}

            </View>
        );
    }

    playAt(positionMillis) {

    }

    speak(text) {
        Speech.speak(text)
    }
}
