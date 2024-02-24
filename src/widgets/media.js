import React from 'react'
import { View, Animated, Easing, Text , ImageBackground} from "react-native";
import { useDispatch, ReactReduxContext, useSelector } from "react-redux";
import { Qili } from "../store"

import { Subtitles, Context as PlayerContext } from "../components/player"
import { PolicyChoice, html, Speak, PlaySound } from '../components';
import PressableIcon from "react-native-use-qili/components/PressableIcon";
import FlyMessage from "react-native-use-qili/components/FlyMessage";

import TagManagement from './management/TagManagement';
import { prompt } from 'react-native-use-qili/components/Prompt';
import ClearAction from '../components/ClearAction';

class Media extends React.Component {
    /**
     * protocol: supported actions
     */
     static Actions({talk, policyName, dispatch, navigate, slug=talk.slug}){
        const hasTranscript = !!talk.languages?.mine?.transcript;
        const margins = { right: 100, left: 20, top: 20, bottom: 20 };
        const Widget = globalThis.Widgets[slug]
        return (
            <PolicyChoice label={false} labelFade={true} value={policyName} 
                excludes={talk?.exludePolicy || ["dictating","retelling"]} 
                deselectable={false}
                onValueChange={policyName => navigate(`/talk/${slug}/${policyName}/${talk.id}`, { replace: true })}>
                    
                {talk.hasLocal && <PressableIcon name="read-more" onPress={e=>navigate(`/widget/${slug}/${talk.id}`)}/>}
                
                <PressableIcon name={talk.favorited ? "favorite" : "favorite-outline"}
                    onPress={()=> dispatch({type:"talk/toggle/favorited", talk})}/>

                
                {talk.hasLocal && <ClearAction {...{talk, policyName}}/>}

                {hasTranscript && <PressableIcon name={hasTranscript ? "print" : ""}
                    onLongPress={async()=>await Print.printAsync({ html: html(talk, 130, margins, true), margins })}
                    onPress={async (e) =>await Print.printAsync({ html: html(talk, 130, margins, false), margins })} 
                />}

                {this.ExtendActions?.(...arguments)}
                <ParentControl {...{talk, policyName}}/>
                <LongMemory {...{talk, policyName}}/>
            </PolicyChoice>
        )
    }
    /**
     * protocol: Tags Management Component
     */
     static TagManagement=null

     /**protocol: a tagged transcripts management component */
     static TaggedTranscript=null

     static Info({talk, policyName, dispatch, navigate, style}){
        switch (policyName) {
            case "general":
                return ( 
                    <View style={style}>
                        <Text style={{fontSize:20}}>{talk.title}</Text>
                        {this.TagManagement()}
                    </View>
                )
            default: 
                return <Subtitles {...{ policy: policyName, style }} />;
        }
     }

     static mediaProps({autoplay, talk, dispatch, policyName, id=talk.id, parentControled}){
        const Widget=this
        const media = <Widget shouldPlay={autoplay} {...talk} policyName={policyName}/>
        const controls={...media.props.controls}
        if(parentControled){
            Object.assign(controls, media.props.parentControls||{})
        }
        return { media, controls};
     }

     static get isWidget(){
        return true
     }

     static remoteSave({shadowing, retelling, dictating, challenging, ...talk}){
        return talk
     }

    static defaultProps = {
        isWidget: true,
        progressUpdateIntervalMillis: 100,
        positionMillis: 0,
        cueHasDuration:false,
        miniPlayer:true,
        controls:{
            progressBar:false,
            chunk:false,  
            video:false,
            speed:false,  
        },
        parentControls:{
            progressBar:false,
            chunk:false,  
            video:false,
            record:false,
            caption:false,
            autoChallenge:false,
            select:false,
        },
        exludePolicy:['dictating', 'retelling'],
    }

    static contextType=ReactReduxContext

    constructor() {
        super(...arguments)
        this.progress = new Animated.Value(0);
        this.state = {}
        this.reset()
    }

    get slug(){
        return this.constructor.defaultProps.slug
    }

    get isMaster(){
        return this.props.slug==this.props.id
    }

    get cueHasDuration(){
        return this.constructor.defaultProps.cueHasDuration
    }

    reset(){
        const {rate=1, volume=1}=this.props
        this.progressing?.stop()
        this.status = {
            isLoaded: false, //it can be true when transcript is prepared
            didJustFinish: false,
            shouldPlay:false,
            durationMillis: 0,
            rate,
            volume,
            get isLoading(){
                return !this.isLoaded
            },
            get isPlaying(){
                return this.shouldPlay
            }
        }
        
        this.progress.current = 0
        this.progress.last = 0
    }

    shouldComponentUpdate(nextProps, state) {
        return this.props!=nextProps || this.state!=state
    }

    onPlaybackStatusUpdate(particular) {
        const status={
            ...this.status,
            ...particular,
            positionMillis: this.progress.current,
        }
        this.props.onPlaybackStatusUpdate?.(status);
    }

    onPositionMillis(positionMillis){
        this.progress.current = positionMillis
        if (this.progress.current - this.progress.last >= this.props.progressUpdateIntervalMillis) {
            this.progress.last = positionMillis;
            this.onPlaybackStatusUpdate();
        }
    }

    componentDidMount() {
        const { positionMillis = 0, shouldPlay } = this.props;
        this.progress.addListener(({ value }) => {
            this.onPositionMillis(Math.floor(value))
        })

        this.setStatusAsync({ shouldPlay, positionMillis });
    }

    componentWillUnmount() {
        this.progress.removeAllListeners()
        this.progressing?.stop()
        Speak.stop()
    }

    setStatusSync({ shouldPlay, positionMillis, rate }, shouldTriggerUpdate=true) {
        shouldTriggerUpdate && console.debug(arguments[0])
        if(rate){
            this.status.rate=rate
        }

        if (positionMillis != undefined) {
            const lastShouldPlay=this.status.shouldPlay
            this.setStatusSync({shouldPlay:false}, false)//stop to reset

            this.progress.last = Math.max(0, positionMillis - this.props.progressUpdateIntervalMillis);
            this.progress.current = positionMillis
            
            this.setStatusSync({shouldPlay:lastShouldPlay}, false)//recover
            this.progress.setValue(this.progress.current);
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
                        //this.setState({isPlaying:false})
                        if(!finished)
                            return
                        this.status.didJustFinish=true
                        this.status.shouldPlay = false
                        this.onPlaybackStatusUpdate()
                        this.progress.setValue(0)
                        this.progress.current = 0
                        this.progress.last = 0
                    })
                    //this.setState({isPlaying:true})
                    shouldTriggerUpdate && this.onPlaybackStatusUpdate()
                } else {
                    this.progressing?.stop()
                    //this.setState({isPlaying:false})
                    this.status.shouldPlay = false
                    shouldTriggerUpdate && this.onPlaybackStatusUpdate()
                }
            }
        }
    }

    setStatusAsync() {
        return new Promise((resolve) =>{
            try{
                this.setStatusSync(...arguments)
            }catch(e){
                console.error(e)
            }finally{
                resolve(this.status)
            }
        })
    }

    title(){
        return this.props.title
    }

    render() {
        const { posterSource, source, title, ...props } = this.props
        return (
            <View {...props} style={{width:"100%",height:"100%",paddingTop:50, paddingBottom:50}}>
                <ImageBackground source={posterSource} style={{width:"100%",height:"100%"}}>
                    {this.doRenderAt()}
                </ImageBackground>
            </View>
        )
    }
}

/**
 * create a list of transcripts, and render state.i cue
 */
export class ListMedia extends Media{
    static cueEqualData(cue, data){
        return !!["text","word","translated","ask"].find(k=>cue.text==data[k])
    }

    reset(){
        super.reset()
        if(this.cues){
            this.setState({i:-1, cues:this.cues=[]})
        }else{
            this.state.i=-1
            this.state.cues=this.cues=[]
        }
    }

    measureTime(a){
        return a.duration || 5*this.props.progressUpdateIntervalMillis
    }

    /**
     * create this.cues=[{time,end,text}]
     */
    createTranscript(){
        
    }

    doCreateTranscript(){
        const cues=this.createTranscript(...arguments)
        if(cues){
            this.cues.splice(0,this.cues.length,...cues)
        }
        if(this.cues.length>0){
            const delta=3*this.props.progressUpdateIntervalMillis
            if(!this.cues[this.cues.length-1].end){
                this.cues.forEach((a,i)=>{
                    a=this.cues[i]={...a}
                    a.time=(i>0 ? this.cues[i-1].end : 0)+delta
                    a.end=a.time+this.measureTime(a)
                })
            }
            this.status.durationMillis=this.cues[this.cues.length-1].end+delta
        }
        this.status.isLoaded=true
        this.onPlaybackStatusUpdate({
            transcript:[{cues:this.cues}]
        })
    }

    onPositionMillis(positionMillis){
        const i =this.i(...arguments)
        if(this.state.i!=i){
            this.setState({i})
        }
        super.onPositionMillis(...arguments)
    }

    componentDidMount(){
        this.doCreateTranscript()
        super.componentDidMount(...arguments)
    }

    setStatusSync({positionMillis}){
        if(typeof(positionMillis)==`undefined`){
            return super.setStatusSync(...arguments)
        }
        const i=this.i(positionMillis)
        positionMillis = i!=-1 ? this.cues[i]?.time : positionMillis
        return super.setStatusSync({...arguments[0],positionMillis})
    }

    /**
     * it's different from i logic of player, since it's hoped to wait for signal from player
     * so it's delayed as late as possible
     * @param {*} positionMillis 
     * @returns 
     */
    i(positionMillis){
        return this.cues.findLastIndex(a=>positionMillis>=a.time)
    }

    doRenderAt(){
        const {i=-1, }=this.state
        if(i==-1)
            return
        const cue=this.cues[Math.floor(i)]
        if(!cue)
            return 


        return this.renderAt(cue)
    }

    speak(props){
        if(!this.status.shouldPlay)
            return null

        if(!this.cueHasDuration){
            const cue=this.cues[this.state.i]
            props={
                ...props,
                onStart:()=>{
                    console.info("start speak "+this.state.i)
                    this.setStatusSync({shouldPlay:false},false)
                },
                onEnd:(duration)=>{
                    console.info("end speak "+this.state.i)
                    cue.duration=duration
                    this.setStatusSync({shouldPlay:true},false)
                }
            }
        }

        if(props.text.audio){
            const {audio}=props.text
            return <PlaySound key={this.state.i} {...{...props, audio, text:undefined}}/>
        }
        return <Speak key={this.state.i} rate={this.status.rate} {...props}/>
    }

    renderAt(cue){
        return null
    }
}

export class TaggedListMedia extends ListMedia{
    //@NOTE: chat.js use this id pattern
    static create({slug=this.defaultProps.slug, ...props}, dispatch){
        return TagManagement.create({slug,...props},dispatch)
    }

    static TagManagement(props){
        return <TagManagement talk={this.defaultProps} {...props}/>
    }

    static async onFavorite({id, talk, state, dispatch}){
        const {lang, mylang}=state.my
        await Qili.fetch({
            id:"save",
            variables:{
                talk:{
                    lang, mylang,
                    ...talk,
                    isWidget:true
                }
            }
        })

        FlyMessage.show("Uploaded to server")
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    createTranscript(){
        return (this.props.data||[]).map(a=>({...a, fulltext:getItemText(a, true, '\n\n')}))
    }

    title(){
        return this.props.title
    }
}

function ParentControl({talk, policyName}){
    const dispatch=useDispatch()
    const controled=useSelector(state=>state.talks[talk.id][policyName]?.parentControled)
    const promptProps=React.useMemo(()=>({
        secureTextEntry:true,
        textContentType:'password',
        placeholder:l10n["Password"],
        }),[])
    return (
        <>
            <PressableIcon name="supervisor-account"
                color={controled ? "yellow" : undefined}
                onLongPress={e=>{
                    dispatch({type:"talk/parentControl/remove", talk:{id:talk.id}, policyName})
                }}
                onPress={e=>{
                    if(controled){
                        prompt('Input password to unlock', promptProps)
                            .then(password=>{
                                if(password==controled){
                                    dispatch({type:"talk/parentControl", talk:{id:talk.id}, controled:false, policyName})
                                }
                            })
                    }else{
                        prompt('Set password to lock', promptProps)
                            .then(password=>{
                                if(password){
                                    dispatch({type:"talk/parentControl", talk:{id:talk.id}, controled:password, policyName})
                                }
                            })
                    }
                }}
            />
        </>
    )
}

function LongMemory({talk, policyName}){
    const dispatch=useDispatch()
    const {firePlayerEvent, challenging}=React.useContext(PlayerContext)
    if(globalThis.Widgets[talk.slug]?.defaultProps?.longMemory===false)
        return null
    if(!challenging || talk.id==`${talk.slug}-longmemory`)
        return null
    
    return (
        <PressableIcon name="library-add" 
                onPress={e => {
                    dispatch({ type: "talk/chanllenge/longmemory", talk, policyName })
                    firePlayerEvent("nav/reset")
                    FlyMessage.show(`Moved to Long Memory`)
                }} 
            />
    )
}