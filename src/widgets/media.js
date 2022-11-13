import React from 'react';
import { View, Animated, Easing, Image, Text } from "react-native";
import {Speak, PressableIcon} from "../components"

export class Media extends React.Component {
    static Actions=()=><></>
    static Management=()=><></>
    static defaultProps = {
        isWidget: true,
        progressUpdateIntervalMillis: 100,
        positionMillis: 0,
    };

    constructor({ rate = 1, volume, positionMillis = 0 }) {
        super(...arguments)
        let shouldPlay=false
        const self=this
        this.status = {
            isLoaded: true,
            didJustFinish: false,
            durationMillis: 0,
            positionMillis,
            rate,
            volume,
            isLoading: false,
            set shouldPlay(v){
                shouldPlay=v
            },
            get shouldPlay(){
                return shouldPlay
            },

            get isPlaying(){
                return shouldPlay
            }
        }
        this.params={}
        
        this.progress = new Animated.Value(0);
        this.progress.current = 0
        this.progress.last = 0

        this.state = {
            isPlaying:shouldPlay,
            _status:this.status,
            _params:this.params,
            _progress:this.progress
        }
    }

    get offsetTolerance(){
        return this.props.progressUpdateIntervalMillis*1.5
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
                    this.status.shouldPlay = true
                    this.status.didJustFinish=false
                    this.progress.setValue(this.progress.current);
                    this.progressing = Animated.timing(this.progress, {
                        toValue: this.status.durationMillis,
                        duration: this.status.durationMillis - this.progress.current,
                        easing: Easing.linear,
                        useNativeDriver: true,
                        isInteraction:false,
                    })
                    this.progressing.start(({finished})=>{
                        this.setState({isPlaying:false})
                        if(!finished)
                            return
                        this.status.didJustFinish=true
                        this.status.shouldPlay = false
                        this.onPlaybackStatusUpdate()
                        this.progress.setValue(0)
                        this.progress.current = 0
                        this.progress.last = 0
                    })
                    this.setState({isPlaying:true})
                    this.onPlaybackStatusUpdate()
                } else {
                    this.progressing?.stop()
                    this.status.shouldPlay = false
                    this.onPlaybackStatusUpdate()
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
        const { thumb, posterSource = thumb, source, ...props } = this.props
        return (
            <View {...props} style={{width:"100%",height:"100%",paddingTop:50, paddingBottom:50}}>
                {!!posterSource && (<Image source={posterSource}
                    style={{position:"absolute", width: "100%", height: "100%", marginTop:50, marginBottom:50 }} />)}
                {this.renderAt()}
            </View>
        )
    }
}

export class ListMedia extends Media{
    constructor(){
        super(...arguments)
        this.state.i=-1
        this.cues=this.state.cues=[]
    }

    /**
     * create this.cues=[{time,end,text}]
     */
     createTranscript(){
        
    }

    doCreateTranscript(){
        this.createTranscript()
        if(this.cues.length>0){
            this.status.durationMillis=this.cues[this.cues.length-1].time+100
        }
        this.onPlaybackStatusUpdate({
            transcript:[{cues:this.cues}], 
            durationMillis:this.status.durationMillis
        })
    }

    onPlaybackStatusUpdateMore(){
        return {i:this.state.i}
    }

    onPositionMillis(positionMillis){
        const i =this.cues?.findIndex(a=>a.end>=(positionMillis-this.offsetTolerance))
        if(this.state.i!=i){
            this.setState({i})
        }
    }

    componentDidMount(){
        (async()=>{
            try{
                await this.doCreateTranscript()
                super.componentDidMount(...arguments)
            }catch(e){
                console.error(e)
            }
        })()
    }

    setStatusSync({positionMillis}){
        if(typeof(positionMillis)==`undefined`){
            return super.setStatusSync(...arguments)
        }
        const i=this.cues.findIndex(a=>a.end>=positionMillis)
        return super.setStatusSync({...arguments[0],positionMillis:this.cues[i].time})
    }

    renderAt(){ 
        const {debug}=this.props
        const {rate, volume}=this.status
        const {i=-1}=this.state
        const text=this.cues[Math.floor(i)]?.text
        return i>=0 && (
            <>
        <View style={{flexDirection:"row",width:"100%", justifyContent:"space-around"}}>
                    <PressableIcon name="mic" style={{backgroundColor:"red"}}
                        onPress={e=>(alert(1),toggle("Vocabulary"))} />
                    <PressableIcon name="record-voice-over"  style={{backgroundColor:"blue"}}
                        onPress={e=>toggle("Speak")}/>
                    <PressableIcon name="grading"  style={{backgroundColor:"skyblue"}}
                        onPress={e=>toggle("Grammar")}/>
                </View>
            <Speak {...{text, key:i, rate, volume}}>
                {debug && <Text style={{fontSize:20, color:"red"}}>{i}: {text}</Text>}
            </Speak>
            </>
        )
    }
}

