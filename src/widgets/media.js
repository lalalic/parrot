import React from 'react'
import { View, Animated, Easing, Image, Text , TextInput, Pressable, ScrollView, ImageBackground} from "react-native";
import { useDispatch, useSelector, ReactReduxContext } from "react-redux";
import { Link, useNavigate } from 'react-router-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Subtitles } from "../components/player"
import { PressableIcon, PolicyChoice, html, Speak, PlaySound } from '../components';
import { ColorScheme } from '../components/default-style';

import { selectBook } from "../store"

class Media extends React.Component {
    /**
     * protocol: supported actions
     */
     static Actions({talk, policyName, toggleTalk, dispatch, navigate, slug=talk.slug, favorited=talk.favorited, hasHistory=talk.hasHistory}){
        const hasTranscript = !!talk.languages?.mine?.transcript;
        const margins = { right: 100, left: 20, top: 20, bottom: 20 };
        return (
            <PolicyChoice label={false} labelFade={true} value={policyName} excludes={["retelling"]}
                onValueChange={policy => navigate(`/talk/${slug}/${policy}`, { replace: true })}>
                    
                {hasTranscript && <PressableIcon name={hasTranscript ? "print" : ""}
                    onLongPress={async()=>await Print.printAsync({ html: html(talk, 130, margins, true), margins })}
                    onPress={async (e) =>await Print.printAsync({ html: html(talk, 130, margins, false), margins })} 
                />}

                {hasHistory && <PressableIcon name="clear" 
                    onLongPress={e => dispatch({ type: `talk/clear`, id: talk.id, slug, tag:talk.tag})}
                    onPress={e => dispatch({ type: "talk/clear/history", id: talk.id })} 
                />}

                <PressableIcon name={favorited ? "favorite" : "favorite-outline"}
                    onPress={async()=> toggleTalk("favorited")}/>
                
                {this.ExtendActions?.(...arguments)}
            </PolicyChoice>
        )
    }
    /**
     * protocol: Tags Management Component
     */
     static TagManagement=null

     /**protocol: Shortcut thumbnail */
     static Shortcut=undefined
 
     /**protocol: a tagged transcripts management component */
     static TaggedTranscript=null

     static Info({talk, policyName, toggleTalk, dispatch, navigate, style}){
        switch (policyName) {
            case "general":
                return ( 
                    <ScrollView style={style}>
                        <Text>{talk.description}</Text>
                        {this.TagManagement()}
                    </ScrollView>
                )
            default: 
                return <Subtitles {...{ policy: policyName, style }} />;
        }
     }

     static mediaProps({autoplay, talk, dispatch, policyName, id=talk.id}){
        const Widget=this
        const media = <Widget shouldPlay={autoplay} {...talk} />
        return { media, controls: media.props };
     }

     static get isWidget(){
        return true
     }

    static defaultProps = {
        isWidget: true,
        progressUpdateIntervalMillis: 100,
        positionMillis: 0,
        cueHasDuration:false,
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
        if (this.state !== state) {
            return true;
        }
        return false;
    }

    onPlaybackStatusUpdate(particular) {
        const status={
            ...this.status,
            ...particular,
            positionMillis: this.progress.current,
        }
        console.debug(status)
        this.props.onPlaybackStatusUpdate?.(status);
    }

    onPositionMillis(positionMillis){

    }

    componentDidMount() {
        const { progressUpdateIntervalMillis, positionMillis = 0, shouldPlay } = this.props;
        this.progress.addListener(({ value }) => {
            value = Math.floor(value)
            this.onPositionMillis(this.progress.current = value)
            if (this.progress.current - this.progress.last >= progressUpdateIntervalMillis) {
                this.progress.last = value;
                this.onPlaybackStatusUpdate();
            }
        })

        this.setStatusAsync({ shouldPlay, positionMillis });
    }

    componentWillUnmount() {
        this.progress.removeAllListeners()
        this.progressing?.stop()
    }

    setStatusSync({ shouldPlay, positionMillis }, shouldTriggerUpdate=true) {
        shouldTriggerUpdate && console.debug(arguments[0])
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
                    shouldTriggerUpdate && this.onPlaybackStatusUpdate()
                } else {
                    this.progressing?.stop()
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
                resolve()
            }
            
        })
    }

    title(){
        return this.props.title
    }

    render() {
        const { thumb, posterSource = thumb, source, title, ...props } = this.props
        return (
            <View {...props} style={{width:"100%",height:"100%",paddingTop:50, paddingBottom:50}}>
                {!!posterSource && (<Image source={posterSource}
                    style={{position:"absolute", width: "100%", height: "100%", marginTop:50, marginBottom:50 }} />)}
                <Text style={{paddingTop:50, fontSize:20,height:50}}>{this.title()}</Text>
            </View>
        )
    }
}

/**
 * create a list of transcripts, and render state.i cue
 */
export class ListMedia extends Media{
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
        const cues=this.createTranscript()
        if(cues){
            this.cues.splice(0,this.cues.length,...cues)
        }
        if(this.cues.length>0){
            const delta=3*this.props.progressUpdateIntervalMillis
            if(!this.cues[this.cues.length-1].end){
                this.cues.forEach((a,i)=>{
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


    render() {
        const { thumb, posterSource = thumb, source, title, ...props } = this.props
        return (
            <View {...props} style={{width:"100%",height:"100%",paddingTop:50, paddingBottom:50}}>
                <ImageBackground source={posterSource} style={{width:"100%",height:"100%"}}>
                    {this.doRenderAt()}
                </ImageBackground>
            </View>
        )
    }

    doRenderAt(){
        const {i=-1}=this.state
        if(i==-1)
            return
        const cue=this.cues[Math.floor(i)]
        if(!cue)
            return 

        return this.renderAt(cue, Math.floor(i))
    }

    speak(props){
        if(!this.cueHasDuration){
            const cue=this.cues[this.state.i]
            props={
                ...props,
                onStart:()=>{
                    console.debug("start speak "+this.state.i)
                    this.setStatusSync({shouldPlay:false},false)
                },
                onEnd:(duration)=>{
                    console.debug("end speak "+this.state.i)
                    cue.duration=duration
                    this.setStatusSync({shouldPlay:true},false)
                }
            }
        }
        if(props.text.audio){
            const {audio}=props.text
            return <PlaySound key={this.state.i} {...{...props, audio, text:undefined}}/>
        }
        return <Speak key={this.state.i} {...props}/>
    }

    renderAt(cue,i){
        return null
    }
}

export class TaggedListMedia extends ListMedia{
    //@NOTE: chat.js use this id pattern
    static create({title,tag,id, ...talk}, dispatch){
        id=id||`${this.defaultProps.slug}${Date.now()}`
        tag=tag||`${title}-${new Date().asDateTimeString()}`
        dispatch({type:"talk/toggle",talk:{...this.defaultProps,id,tag,title,...talk}})
        return id
    }

    static Shortcut(props){
        return <TagShortcut slug={this.defaultProps.slug}/>
    }

    static TagManagement(props){
        return <TagManagement talk={this.defaultProps} placeholder={`Tag: to categorize ${this.defaultProps.title}`} {...props}/>
    }


    createTranscript(){
        const state=this.context.store.getState()
        const {slug, tag}=this.props
        return selectBook(state, slug, tag).map(({tags, ...a})=>a)
    }

    title(){
        return this.props.tag
    }
}

export const TagList=({data, onEndEditing, navigate=useNavigate(), children, appendable=true,
    renderItemText=a=>a.id, dispatch=useDispatch(),
    renderItem:renderItem0=({item, slug=item.slug, id=item.id})=>(
        <Pressable key={id} 
            onPress={e=>navigate(`/talk/${slug}/shadowing/${id}`)} 
            onLongPress={e=>dispatch({type:"talk/clear", id})}
            style={{height:50, justifyContent:"center", paddingLeft:20, border:1, borderBottomColor:color.inactive}}>
            <Text style={{fontSize:16}}>{renderItemText(item)}</Text>
        </Pressable>
    ),
    placeholder, 
    inputProps:{style:inputStyle,...inputProps}={}, 
    listProps:{style:listStyle, renderItem=renderItem0, ...listProps}={}, 
    style, ...props})=>{
        const color=React.useContext(ColorScheme)
        return (
            <View style={[{marginTop:10, minHeight:200},style]} {...props}>
                {appendable && <TextInput onEndEditing={onEndEditing} placeholder={placeholder}
                    style={[{height:50, backgroundColor:color.inactive, paddingLeft:10, fontSize:16},inputStyle]}
                    {...inputProps}
                    />}
                {data.map(item=>renderItem({item}))}
                {children}
            </View>
        )
}

export const TagShortcut=({slug, style={left:10}})=>{
    const color=React.useContext(ColorScheme)
    return (
        <Link to={`/talk/manage/${slug}`} style={{position:"absolute", top:10, height:50,...style}} >
            <MaterialIcons name="category" size={32} color={color.text}/>
        </Link>
    )
}

export const TagManagement=({talk, placeholder, appendable=true, onCreate})=>{
    const slug=talk.slug
    const dispatch=useDispatch()
    const tags=useSelector(state=>Object.values(state.talks).filter(a=>a.slug==slug && a.id!=slug))
    React.useEffect(()=>{
        if(tags.length==0){
            talk.tags?.forEach(tag=>{
                dispatch({type:"talk/toggle", talk:{...talk,id:`${talk.id}_${tag}`, tag}})
            })
        }
    },[tags])

    return (
        <TagList data={tags} 
            placeholder={placeholder}
            appendable={appendable}
            onEndEditing={({nativeEvent:{text:tag}})=>{
                tag=tag.trim()
                if(!tag || -1!==tags.findIndex(a=>a.tag==tag)){
                    return 
                }
                if(onCreate){
                    return onCreate({...talk, tag}, dispatch)
                }else{
                    dispatch({type:"talk/toggle", talk:{...talk,id:`${talk.id}_${tag}`, tag}})
                }
            }}
            renderItemText={item=>item.tag}
        >
            {!!tags.length && appendable && <TagShortcut key="shortcut" slug={slug} style={{right:10}}/>}
        </TagList>
    )
}
