import React from 'react';
import { View, Animated, Easing, Image } from "react-native";


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
        }
        this.params={}
        
        this.progress = new Animated.Value(0);
        this.progress.current = 0
        this.progress.last = 0

        this.state = {
            _status:this.status,
            _params:this.params,
            _progress:this.progress
        }
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
            ...this.onPlaybackStatusUpdateMore?.()
        });
    }

    onPositionMillis(positionMillis){

    }

    componentDidMount() {
        const { progressUpdateIntervalMillis, positionMillis = 0, shouldPlay } = this.props;
        this.progress.addListener(({ value }) => {
            if (value == 0)
                return;
            value = Math.floor(value)
            this.onPositionMillis(this.progress.current = value)
            if (this.progress.current - this.progress.last >= progressUpdateIntervalMillis) {
                this.progress.last = value;
                this.onPlaybackStatusUpdate();
            }
        })

        this.setStatusAsync({ shouldPlay, positionMillis });
        this.onPlaybackStatusUpdate();
    }

    componentWillUnmount() {
        this.progress.removeAllListeners()
        this.progressing?.stop()
    }

    setStatusSync({ shouldPlay, positionMillis }) {
        console.log(JSON.stringify(arguments[0]))
        if (positionMillis != undefined) {
            const lastShouldPlay=this.status.shouldPlay
            this.setStatusSync({shouldPlay:false})//stop to reset

            this.progress.last = Math.max(0, positionMillis - (this.progress.current - this.progress.last));
            this.progress.current = positionMillis
            
            this.setStatusSync({shouldPlay:lastShouldPlay})//recover
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
                        isInteraction:false,
                    })
                    this.progressing.start(({finished})=>{
                        if(!finished)
                            return
                        this.status.didJustFinish=true
                        this.status.isPlaying = false
                        this.onPlaybackStatusUpdate()
                        this.progress.setValue(0)
                        this.progress.current = 0
                        this.progress.last = 0
                    })
                } else {
                    this.progressing?.stop()
                    this.status.isPlaying = false
                    this.status.shouldPlay = false
                }
            }
        }
    }

    setStatusAsync() {
        return new Promise((resolve) =>{
            this.setStatusSync(...arguments)
            resolve()
        })
    }

    render() {
        const { thumb, posterSource = thumb, source, ...props } = this.props;
        return (
            <View {...props} style={{width:"100%",height:"100%",}}>
                {false && !!posterSource && (<Image source={posterSource}
                    style={{ position: "absolute", width: "100%", height: "100%" }} />)}
                {this.renderAt()}
            </View>
        )
    }
}

export class ListMedia extends Media{
    constructor(){
        super(...arguments)
        this.state.i=-1
        this.cues=[]
    }

    setStatusSync({positionMillis}){
        if(typeof(positionMillis)==`undefined`){
            return super.setStatusSync(...arguments)
        }
        const i=this.cues.findIndex(a=>a.end>=positionMillis)
        return super.setStatusSync({...arguments[0],positionMillis:this.cues[i].time})
    }
}
