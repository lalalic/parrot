import React from 'react'
import { View, Animated, Easing, Image, Text , TextInput, ScrollView, ImageBackground, FlatList, Pressable} from "react-native";
import { useDispatch, useSelector, ReactReduxContext } from "react-redux";
import { Link, useNavigate } from 'react-router-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { selectWidgetTalks, TalkApi, Qili } from "../store"

import { Subtitles } from "../components/player"
import { PolicyChoice, html, Speak, PlaySound } from '../components';
import PressableIcon from "react-native-use-qili/components/PressableIcon";
import ChangableText from "react-native-use-qili/components/ChangableText";
import Loading from "react-native-use-qili/components/Loading";
import { ColorScheme } from 'react-native-use-qili/components/default-style';
const l10n=globalThis.l10n

class Media extends React.Component {
    /**
     * protocol: supported actions
     */
     static Actions({talk, policyName, dispatch, navigate, slug=talk.slug}){
        const hasTranscript = !!talk.languages?.mine?.transcript;
        const margins = { right: 100, left: 20, top: 20, bottom: 20 };
        return (
            <PolicyChoice label={false} labelFade={true} value={policyName} excludes={["retelling"]} deselectable={false}
                onValueChange={policyName => navigate(`/talk/${slug}/${policyName}`, { replace: true })}>
                    
                {talk.hasLocal && <PressableIcon name="read-more" onPress={e=>navigate(`/widget/${slug}/${talk.id}`)}/>}
                
                <PressableIcon name={talk.favorited ? "favorite" : "favorite-outline"}
                    onPress={()=> dispatch({type:"talk/toggle/favorited", talk})}/>

                
                {talk.hasLocal && <PressableIcon name="delete-sweep" 
                    onLongPress={e => dispatch({ type: `talk/clear`, id: talk.id, slug, tag:talk.tag})}
                    onPress={e => dispatch({ type: "talk/clear/policy/history", id: talk.id, policy:policyName })} 
                />}

                {hasTranscript && <PressableIcon name={hasTranscript ? "print" : ""}
                    onLongPress={async()=>await Print.printAsync({ html: html(talk, 130, margins, true), margins })}
                    onPress={async (e) =>await Print.printAsync({ html: html(talk, 130, margins, false), margins })} 
                />}

                {this.ExtendActions?.(...arguments)}
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

     static mediaProps({autoplay, talk, dispatch, policyName, id=talk.id}){
        const Widget=this
        const media = <Widget shouldPlay={autoplay} {...talk} policyName={policyName}/>
        return { media, controls: media.props };
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
        return !!["text","translated","ask"].find(k=>cue.text==data[k])
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
        const cues=this.createTranscript()
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
        return <Speak key={this.state.i} rate={this.status.rate} {...props}/>
    }

    renderAt(cue,i){
        return null
    }
}

export class TaggedListMedia extends ListMedia{
    //@NOTE: chat.js use this id pattern
    static create({id, slug=this.defaultProps.slug, ...talk}, dispatch){
        console.assert(slug, "Slug must be specified when creating widget talk")
        id=`${slug}${Date.now()}`
        dispatch({type:"talk/set",talk:{data:[],...talk,id,slug}})
        return id
    }

    static TagManagement(props){
        return <TagManagement talk={this.defaultProps} {...props}/>
    }

    static async onFavorite({id, talk, state, dispatch}){
        await Qili.fetch({
            id:"save",
            variables:{
                talk:{
                    ...talk,
                    isWidget:true
                }
            }
        }, state.my.admin)

        console.info(`Cloned the talk to Qili`)
    }

    createTranscript(){
        return [...(this.props.data||[])]
    }

    title(){
        return this.props.title
    }
}

export const TagList=({data, slug, onEndEditing, navigate=useNavigate(), children, iconWidth=50,
    renderItemExtra=({item})=>{
        if(item.isLocal!==true){
            return (
                <View style={{width:iconWidth,alignContent:"center",alignItems:"center"}}>
                    <MaterialIcons name="keyboard-arrow-right"/>
                </View>
            )
        }
        return (
            <PressableIcon name="keyboard-arrow-right" 
                onPress={e=>navigate(`/widget/${item.slug}/${item.id}`)} 
                style={{width:iconWidth}}/>
        )
    },
    renderItemText=a=>a.id, dispatch=useDispatch(),
    renderItem:renderItem0=function({item, id=item.id}){
        const text=renderItemText(item)
        const textStyle={fontSize:16, color:"white"}
        const containerStyle={height:50, justifyContent:"center", border:1, borderBottomColor:color.inactive}
        if(item.isLocal!==true){//remote
            return (
                <Pressable style={[containerStyle,{flexDirection:"row",alignItems:"center", marginTop:2}]} 
                    onPress={e=>navigate(`/talk/${slug}/shadowing/${id}`)} 
                    key={id}>
                    <View style={{width:iconWidth, alignItems:"center"}}>
                        <MaterialIcons name="cloud-circle"/>
                    </View>
                    <Text style={[{flexGrow:1}, textStyle]}>{text}</Text>
                    {renderItemExtra?.(...arguments)}
                </Pressable>
            )
        }

        return (//local
            <View style={{flexDirection:"row", marginTop:2}} key={id} >
                <PressableIcon name="remove-circle-outline" onPress={e=>dispatch({type:"talk/clear", id})} style={{width:iconWidth}}/>
                <ChangableText style={[containerStyle,{flexGrow:1}]}
                    text={{style:textStyle, value:text}}
                    onPress={e=>navigate(item.data?.length ? `/talk/${slug}/shadowing/${id}` : `/widget/${item.slug}/${item.id}`)} 
                    onChange={title=>dispatch({type:"talk/set", talk:{id, title}})}
                    />
                {renderItemExtra?.(...arguments)}
            </View>
        )
    },
    placeholder, 
    inputProps:{style:inputStyle,...inputProps}={}, 
    listProps:{style:listStyle, renderItem=renderItem0, ...listProps}={}, 
    style, ...props})=>{
    const color=React.useContext(ColorScheme)

    const {data:{talks=[]}={}, isLoading}=TalkApi.useWidgetTalksQuery({slug})

    const all=React.useMemo(()=>{
        const locals=data.map(a=>a.id)
        return [
            ...data.map(a=>({...a, isLocal:true})).sort(), 
            ...talks.filter(a=>locals.indexOf(a.id)==-1).sort((a,b)=>{
                const aTitle=a.title.toUpperCase(), bTitle=b.title.toUpperCase()
                return aTitle<bTitle ? -1 : (aTitle>bTitle ? 1 : 0)
            })
        ]
    },[data, talks])

    return (
        <View style={[{flex:1, marginTop:10, minHeight:200},style]} {...props}>
            <TextInput onEndEditing={onEndEditing} placeholder={placeholder}
                style={[{height:50, backgroundColor:color.text, color:color.backgroundColor, paddingLeft:10, fontSize:16,borderRadius:5},inputStyle]}
                {...inputProps}
                />
            <FlatList data={all} style={{flex:1, flexGrow:1}}
                keyExtractor={({id, isLocal})=>`${id}-${isLocal}`}
                renderItem={renderItem}
                />
            {isLoading && <Loading style={{backgroundColor:"transparent"}}/>}
            {children}
        </View>
    )
}


export const TagManagement=({talk, placeholder, onCreate, slug=talk.slug, dispatch=useDispatch(), ...props})=>{
    const talks=useSelector(state=>selectWidgetTalks(state, slug))
    return (
        <TagList  
            data={talks} slug={slug}  placeholder={l10n[placeholder||`Create new ${talk.title}`]}
            onEndEditing={({nativeEvent:{text:title}})=>{
                title=title.trim()
                if(!title || -1!==talks.findIndex(a=>a.title==title)){
                    return 
                }

                if(onCreate){
                    onCreate({title,slug}, dispatch)
                }else{
                    TaggedListMedia.create({title,slug, data:[]}, dispatch)
                }
            }}
            renderItemText={item=>item.title}
            {...props}
        />
    )
}