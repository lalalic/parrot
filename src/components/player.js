import React, {PureComponent} from 'react';
import {View, Text, ActivityIndicator, Pressable, FlatList} from "react-native"
import {shallowEqual, useSelector} from "react-redux"
import { Audio } from 'expo-av'
import { produce } from "immer"
import Slider from '@react-native-community/slider'
import * as FileSystem from "expo-file-system"
import * as Sharing from "expo-sharing"
import * as ImagePicker from "expo-image-picker"
import { useKeepAwake} from "expo-keep-awake"


import PressableIconA from "react-native-use-qili/components/PressableIcon";
import { ColorScheme } from 'react-native-use-qili/components/default-style';
import { diffPretty } from '../experiment/diff';
import { Delay } from "../components/delay"
import { SliderIcon, PlayButton, AutoHide, Recognizer, ControlIcons, PlaySound, useSound} from '../components';

export const Context=React.createContext({})
const asyncCall=fn=>setTimeout(fn, 0)

const PressableIcon=({color="gray",...props})=><PressableIconA {...props} color={color}/>
/**
 * 2 models: with or without transcript
 * cue: {text(audio, caption, subtitles), test=text(recognze, diff), time, end}
@TODO: 
1. why is it constantly rerendered although status is not changed 
 */
export default function Player({
    debug=true,
    id, //talk id 
    media,
    style, title,
    children, //customizable controls
    policyName="general", //used to get history of a policy
    policy,

    challenging,
    
    toggleChallengeChunk,getRecordChunkUri,  
    onPolicyChange, onRecordChunk, onQuit,

    controls:_controls,
    transcript:_transcript,
    layoverStyle, navStyle, subtitleStyle, progressStyle,
    ...props}){
    const performanceCount=React.useRef(0)
    console.info(`player rendered ${performanceCount.current++} times`)
    
    const video=React.useRef()
    const nextRound=React.useRef()

    const challenges=useSelector(state=>state.talks[id]?.[policyName]?.challenges)

    const autoHideActions=React.useRef()
    const autoHideProgress=React.useRef()
    const setAutoHide=React.useCallback((time)=>{
        autoHideProgress.current?.(time)
        autoHideActions.current?.(policy.autoHide ? time : false)
    },[policy.autoHide])

    const changePolicy=(key,value)=>{
        onPolicyChange?.({[key]:value})
        setAutoHide(Date.now())
    }

    const [transcript, setTranscript]=React.useState(_transcript)
    
    /**
     * why not in Talk?
     * > Widget set transcript by itself
     * > chunk has cue protocole {text, test=text, time, end}
     */
    const chunks=React.useMemo(()=>{
        if(challenging){
            return challenges||[]
        }else if(transcript && typeof(policy.chunk)=="number"){
            const paragraphs=transcript
            switch(policy.chunk){        
                case 0:
                case 1:
                    return paragraphs.map(p=>p.cues).flat()
                case 9:
                    return paragraphs.map(p=>{
                        const text=p.cues.map(a=>a.text).join("")
                        const time=p.cues[0].time
                        const end=p.cues[p.cues.length-1]?.end
                        return {text,time,end}
                    })
                case 10:
                    return ([{
                        text:paragraphs.map(a=>a.cues.map(b=>b.text).join(" ")).join("\n"),
                        test:paragraphs.map(a=>a.cues.map(b=>b.test||"").join(" ").trim()).filter(a=>!!a).join("\n")||undefined,
                        time:paragraphs[0].cues[0].time,
                        end:status.durationMillis
                    }])
                default:
                    return (
                        paragraphs.map(p=>p.cues).flat()
                            .reduce((chunks,a,i)=>{
                                if(i%policy.chunk==0)
                                    chunks.push([])
                                chunks[chunks.length-1].push(a)
                                return chunks
                            },[])
                            .map(a=>({
                                text:a.map(a=>a.text).join(" "),
                                test:a.map(a=>a.test||"").join(" ").trim()||undefined,
                                time:a[0].time,
                                end:a[a.length-1].end
                            }))
                    )
            }
        }
        return []
    },[id, policy.chunk, /*policy.fullscreen,*/ challenging, challenges, transcript])

    const stopOnMediaStatus=React.useRef(false)
    const setMediaStatusAsync=React.useCallback(async (status, callback)=>{
        debug && console.debug({setMediaStatusAsync:true,...status})
        stopOnMediaStatus.current=true
        const done = await video.current?.setStatusAsync(status)
        stopOnMediaStatus.current=false
        callback?.()
        return done
    },[video])

    
    /** 
     * nextRound should be called after challenge store updated, 
     * so wait 1 second after last whitespacing end 
     * 
     * nextRound must use latest chunks and challenging
     * */
    nextRound.current=React.useCallback(shouldPlay=>{
        setMediaStatusAsync({
            shouldPlay:shouldPlay==undefined ? !!challenging : shouldPlay, 
            positionMillis:chunks[0]?.time
        })
    },[chunks[0]?.time, !!challenging])
    const [status, _setStatus] = React.useReducer((state,action)=>{
        const {isPlaying, i, whitespacing, rate:currentRate, lastRate}=state
        const {chunks}=action
        const rate=lastRate||currentRate

        function terminateWhitespace(next, newState, callback){
            whitespacing && clearTimeout(whitespacing)
            setMediaStatusAsync(next={shouldPlay:true, rate, ...next}, callback)
            return produce(state, $state=>{
                $state.isPlaying=next.shouldPlay
                delete $state.whitespace
                delete $state.whitespacing
                delete $state.lastRate
                if(next?.positionMillis)
                    $state.minPositionMillis=next.positionMillis
                for (const key in newState){
                    $state[key]=newState[key]
                }
            })
        }

        const CurrentChunkPositionMillis=(I=i)=>chunks[I]?.time ?? chunks[0]?.time
        const nextState=(()=>{
            switch(action.type){
                case "nav/replaySlow":
                    return terminateWhitespace(
                        {positionMillis:CurrentChunkPositionMillis(),rate:Math.max(0.25,rate-0.25)},
                        {lastRate:rate}
                    )
                case "nav/replay":
                    return terminateWhitespace(
                        {positionMillis:CurrentChunkPositionMillis()},
                        {canReplay:state.canReplay-1}
                    )
                case "nav/prevSlow":
                    return (prev=>terminateWhitespace(
                        {positionMillis:CurrentChunkPositionMillis(prev), rate:Math.max(0.25,rate-0.25)},
                        {lastRate:rate, i: prev}
                    ))(Math.max(i-1,0))
                case "nav/prev":
                    return (prev=>terminateWhitespace(
                        {positionMillis:CurrentChunkPositionMillis(prev)},
                        {i: prev}
                    ))(Math.max(i-1,0))
                case "nav/play":
                    return terminateWhitespace({
                        shouldPlay:whitespacing ? false : !isPlaying, 
                        positionMillis: CurrentChunkPositionMillis()
                    })
                case "nav/reset":{
                    asyncCall(()=>onProgress.current?.(0))
                    return terminateWhitespace(
                        {shouldPlay:false},
                        {i:0}, 
                        ()=>setTimeout(()=>nextRound.current(false),1000)//wait 1 second for challege store complete
                    )
                }
                case "whitespace/end":{
                    if(action.isLast){
                        asyncCall(()=>onProgress.current?.(0))
                        return terminateWhitespace(
                            {shouldPlay:false},
                            {i:0}, 
                            ()=>setTimeout(()=>nextRound.current(),1000)//wait 1 second for challege store complete
                        )
                    }else{
                        //same as nav/next
                    }
                }
                case "nav/next":
                    return (next=>terminateWhitespace(
                                    {positionMillis:CurrentChunkPositionMillis(next)}, 
                                    {i: next}
                                )
                            )((i+1)%chunks.length)
                case "nav/pause":
                    return terminateWhitespace({
                        shouldPlay:false, 
                        positionMillis: CurrentChunkPositionMillis()
                    },{}, action.callback)
                case "nav/challenge":{
                    const i=action.i ?? state.i
                    i!=-1 && asyncCall(()=>toggleChallengeChunk?.(chunks[i]))
                    break
                }
                case "speed/toggle":
                    setMediaStatusAsync({rate:rate==0.75 ? 1 : 0.75})
                        .then(a=>changePolicy("speed",a.rate))
                break
                case "speed/tune":
                    setMediaStatusAsync({rate:action.rate})
                        .then(a=>changePolicy("speed",a.rate))
                break
                case "record/chunk"://not implemented
                    asyncCall(()=>onLongtermChallenge?.(action.chunk))
                break
                case "media/time":{
                    const i=chunks.findIndex(a=>a.time>=action.time)
                    return terminateWhitespace(
                        {positionMillis:CurrentChunkPositionMillis(i),shouldPlay:action.shouldPlay ?? isPlaying},
                        {i: i==-1 ? chunks.length-1 : i}
                    )
                }
                case "media/status/changed":
                    return action.state
            }

            return state
        })();
        if(!shallowEqual(nextState, state) && debug){
            debug && console.debug(`status: ${action.type}: next[${chunks[nextState.i]?.time||""}-${chunks[nextState.i]?.end||""}]\n${JSON.stringify(nextState)}`)
        }
        return nextState
    },{isLoaded:false, i:-1, durationMillis:0});
    /**
     * state reducer use chunks, so make a shallow dispatch with chunks injected to action
     */
    const dispatch=React.useCallback(action=>{
        _setStatus(Object.assign(action, { chunks }))
    },[chunks])

    const firePlayerEvent=React.useCallback(action=>dispatch({type:action}),[dispatch])

    const controls=React.useMemo(()=>{
        return {
            ..._controls,
            ...(chunks.length==0 && {subtitle:false, record:false,video:false,caption:false,chunk:false, slow:false,prev:false,next:false,select:false}),
            ...(challenging && {chunk:false}),
//            ...(policy.fullscreen && {slow:false,prev:false,next:false,select:false})
        }
    },[_controls,chunks, policy.fullscreen, challenging,])

    /**
     * move out of reducer to bail out rerender
     */
    const onProgress=React.useRef()

    const onMediaStatus=React.useCallback((state, action)=>{
        asyncCall(()=>onProgress.current?.(action.status.positionMillis))
        const {i, whitespacing}=state
        const nextState=(()=>{
            if(action.status.transcript){
                setTranscript(action.status.transcript)
            }
    
            if(stopOnMediaStatus.current // setting status async
                || action.status.shouldPlay!=action.status.isPlaying // player is ajusting play status 
                || action.status.positionMillis<=state.minPositionMillis //player offset ajustment
                || whitespacing //
            ){
                return state
            }
            
            const {status:{isLoaded,positionMillis, isPlaying,rate,durationMillis=0,didJustFinish, 
                i:_i=positionMillis<chunks[0]?.time ? -1 : chunks.findIndex(a=>a.end>=positionMillis)}}=action
            
            const current={isLoaded,isPlaying,rate,durationMillis,i:_i}

            if(!isLoaded){//init video pitch, props can't work
                setMediaStatusAsync({shouldCorrectPitch:true,pitchCorrectionQuality:Audio.PitchCorrectionQuality.High})
                return current
            }

            //copy temp keys from state
            ;["lastRate"].forEach(k=>k in state && (current[k]=state[k]))

            const isLast=chunks.length>0 && _i==-1 && i==chunks.length-1

            if(positionMillis>=chunks[i]?.end && //current poisiton must be later than last's end
                (i+1==_i //normally next
                    || isLast)//last 
                    ){//current is over
                if(policy.whitespace){
                    console.info('whitespace/start')
                    const whitespace=policy.whitespace*(chunks[i].duration||(chunks[i].end-chunks[i].time))
                    setMediaStatusAsync({shouldPlay:false}, globalThis.sounds.ding)
                    const whitespacing=setTimeout(()=>dispatch({type: "whitespace/end", isLast}),whitespace+2000)
                    return {...state, whitespace, whitespacing}
                }
            }

            return current
        })();

        if(state!=nextState && !shallowEqual(state,nextState)){
            dispatch({type:"media/status/changed", state:nextState})
        }
    },[policy,chunks, challenges, challenging])
    
    const isChallenged=React.useMemo(()=>!!challenges?.find(a=>a.time==chunks[status.i]?.time),[chunks[status.i],challenges])

    const onRecord=React.useCallback(record=>{
        const {i, chunk=chunks[i]}=status
        const isLastChunk = i>=chunks.length-1
        onRecordChunk?.({chunk, record, isLastChunk})
    },[status.i,chunks])
    
    const [showSubtitle, setShowSubtitle]=React.useState(true)
    useKeepAwake()

    return (
        <>
        <SliderIcon.Container 
            style={style} 
            onStartShouldSetResponder={e=>setAutoHide(Date.now())}
            {...props}>
            {React.cloneElement(media, {
                ref:video,
                onPlaybackStatusUpdate:mediaStatus =>{
                    debug && console.debug(`media status: ${JSON.stringify(mediaStatus)}`)
                    onMediaStatus(status, {type:"media/status", status: mediaStatus})
                },
                rate:policy.rate, 
                style:{flex:1, minHeight:150},
                positionMillis: useSelector(state=>state.talks[id]?.[policyName]?.history??0),
                
                policy, whitespacing: status.whitespacing,
            })}
            <View pointerEvents='box-none'
                style={[{position:"absolute",width:"100%",height:"100%",backgroundColor:false!=policy.visible?"transparent":"black"},layoverStyle]}>
                {false!=controls.nav && 
                <View style={{flex:1, flexDirection:"column", justifyContent:"center"}}>
                    <NavBar {...{
                        testID: "navBar",
                        controls,isChallenged,
                        dispatch,status,
                        navable:chunks?.length>=2,
                        size:32, style:navStyle }}/>
                </View>
                }
                
                <AutoHide hide={autoHideActions} testID="controlBar" style={{height:40,flexDirection:"row",padding:4,justifyContent:"flex-end",position:"absolute",top:0,width:"100%"}}>
                    {false!=controls.record && <PressableIcon style={{marginRight:10}} testID="record"
                        name={`${ControlIcons.record}${!policy.record?"-off":""}`} 
                        onPress={e=>changePolicy("record",!policy.record)}
                        />}

                    {false!=controls.video && <PressableIcon style={{marginRight:10}} testID="video"
                        name={`${ControlIcons.visible}${!policy.visible?"-off":""}`} 
                        onPress={e=>changePolicy("visible",!policy.visible)}/>}

                    {false!=controls.caption && <SliderIcon style={{marginRight:10}} testID="caption"
                        icon={`${ControlIcons.caption}${!policy.caption ? "-disabled":""}`}
                        onToggle={()=>changePolicy("caption",!policy.caption)}
                        onSlideFinish={delay=>changePolicy("captionDelay",delay)}
                        slider={{minimumValue:0,maximumValue:3,step:1,value:policy.captionDelay,text:t=>`${-t}s`}}/>}
                    
                    {false!=controls.autoChallenge && <SliderIcon style={{marginRight:10}} testID="autoChallenge"
                        icon={policy.autoChallenge>0 ? ControlIcons.autoChallenge : "alarm-off"}
                        onToggle={e=>changePolicy("autoChallenge",policy.autoChallenge ? 0 : 80)}
                        onSlideFinish={value=>changePolicy("autoChallenge",value)}
                        slider={{minimumValue:0,maximumValue:100,step:5,value:policy.autoChallenge??0}}/>}

                    {false!=controls.speed && <SliderIcon style={{marginRight:10}} testID="speed"
                        icon={ControlIcons.speed} 
                        onToggle={()=>dispatch({type:"speed/toggle"})}
                        onSlideFinish={rate=>dispatch({type:"speed/tune",rate})}
                        slider={{minimumValue:0.5,maximumValue:1.5,step:0.25,value:policy.speed,text:t=>`${t}x`}}/>}

                    {false!=controls.whitespace && <SliderIcon style={{marginRight:10}} testID="whitespace"
                        icon={policy.whitespace>0 ? ControlIcons.whitespace : "notifications-off"}
                        onToggle={()=>changePolicy("whitespace",policy.whitespace>0 ? 0 : 1)}
                        onSlideFinish={value=>changePolicy("whitespace",value)}
                        slider={{minimumValue:0.5,maximumValue:4,step:0.5,value:policy.whitespace,text:t=>`${t}x`}}/>}

                    {false!=controls.chunk && <SliderIcon style={{marginRight:10}} testID="chunk"
                        icon={policy.chunk>0 ? ControlIcons.chunk : "flash-off"}
                        onToggle={()=>changePolicy("chunk",policy.chunk>0 ? 0 : 1)}
                        onSlideFinish={value=>changePolicy("chunk",value)}
                        slider={{minimumValue:0,maximumValue:10,step:1,value:policy.chunk,text:t=>({'9':"paragraph","10":"whole"})[t+'']||`${t} chunks`}}/>}

                    {false!=controls.fullscreen && <PressableIcon style={{marginRight:10}} testID="fullscreen"
                        name={!policy.fullscreen ? ControlIcons.fullscreen : "fullscreen-exit"}
                        onLongPress={e=>{
                            (async()=>{
                                let result = await ImagePicker.launchImageLibraryAsync({
                                    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                                    allowsEditing: true,
                                  });
                                if(!result.cancelled){
                                    if(available){
                                        await Sharing.shareAsync(result.assets[0].uri)
                                    }
                                }
                            })();
                        }}
                        onPress={e=>{
                            changePolicy("fullscreen", !policy.fullscreen)
                        }}/>}
                </AutoHide>
                
                <View style={{position:"absolute",bottom:0, width:"100%"}}>
                    {status.whitespacing && 
                        <Recognizer 
                            key={chunks[status.i].text} 
                            id={chunks[status.i].text} 
                            locale={chunks[status.i]?.recogMyLocale}
                            onRecord={onRecord}  
                            style={{width:"100%",textAlign:"center",fontSize:16}}
                            uri={chunks[status.i] && getRecordChunkUri?.(chunks[status.i])} 
                            />
                    }

                    {showSubtitle && policy.caption && false!=controls.subtitle && 
                    <Subtitle 
                        testID="subtitle"
                        style={{width:"100%",textAlign:"center",fontSize:16, ...subtitleStyle}}
                        id={id} item={chunks[status.i]} policyName={policyName}
                        numberOfLines={4}
                        adjustsFontSizeToFit={true}
                        delay={chunks[status.i]?.test ? 0 : policy.captionDelay/*delay for test*/}
                        />
                    }

                    {controls.progressBar!=false && <AutoHide hide={autoHideProgress} style={[{position:"absolute",bottom:0, width:"100%"},progressStyle]}>
                        <ProgressBar {...{
                            onProgress,
                            duration:status.durationMillis,
                            onValueChange:time=>dispatch({type:"media/time", time:Math.floor(time)}),
                            onSlidingStart:e=>setAutoHide(Date.now()+2*60*1000),
                            onSlidingComplete:e=>setAutoHide(Date.now())
                        }}/> 
                    </AutoHide>}
                </View>
            </View>
        </SliderIcon.Container>

        {!policy.fullscreen && 
        <Context.Provider 
            value={{
                id, status, chunks, dispatch, setShowSubtitle, 
                getRecordChunkUri, policy, policyName, challenging,
                firePlayerEvent, media:video, controls,
            }}>
            {children}
        </Context.Provider>
        }
        <PersistentHistory onQuit={onQuit} positionMillis={chunks[status.i]?.time}/>
        </>
    )
}

class PersistentHistory extends PureComponent{
    componentWillUnmount(){
        const {onQuit, positionMillis}=this.props
        onQuit({time:positionMillis})
    }

    render(){
        return null
    }
}


export function ProgressBar({value:initValue=0, duration=0,style, onValueChange, onProgress,onSlidingComplete,onSlidingStart, ...props}){
    const [value, setValue]=React.useState(initValue)
    React.useEffect(()=>{
        onProgress.current=setValue
    },[])
    return (
        <View style={[{flex:1,flexDirection:"row"},style]} {...props}>
            <View style={{justifyContent:"center",width:50}}>
                <TimeText style={{textAlign:"right",}} time={value}/>
            </View>
            <View style={{justifyContent:"center",flexGrow:1}}>
                <Slider {...{style:{flexGrow:1},thumbTintColor:"transparent",onValueChange,onSlidingComplete,onSlidingStart,value, maximumValue:duration}}/>
            </View>
            <View style={{justifyContent:"center",width:50,}}>
                <TimeText style={{}} time={(duration-value)}/>
            </View>
        </View>
    )
}

const TimeText=({time,...props})=>{
    const text=((m=0,b=m/1000,a=v=>String(Math.floor(v)).padStart(2,'0'))=>`${a(b/60)}:${a(b%60)}`)(time);
    const [m,s]=text.split(":")
    const textStyle={width:20}
    return (
        <Text {...props}>
            <Text style={textStyle}>{m}</Text><Text>:</Text>
            <Text style={textStyle}>{s}</Text>
        </Text>
    )
}

export function NavBar({dispatch,status={},controls={},isChallenged, navable,style, size=24,...props}){
    const color=React.useContext(ColorScheme)
    const containerStyle={width:"100%",flexDirection:"row",alignItems:"center",alignSelf:"center",justifyContent: "space-around", margin:"auto"}
    return (
        <View style={[containerStyle,style]} {...props}>
            {status.isLoaded && (<>
            <PressableIcon size={size} testID="slow"
                disabled={!navable||controls.slow==false}
                name={controls.slow==false ? "" : (status.whitespacing ? "replay-5":"subdirectory-arrow-left")} 
                onPress={e=>dispatch({type:`nav/${status.whitespacing ? "replay" : "prev"}Slow`})}/>
            <PressableIcon size={size} testID="prev"
                disabled={!navable||controls.prev==false}
                name={controls.prev==false ? "" : (status.whitespacing ? "replay" : "keyboard-arrow-left")} 
                onPress={e=>dispatch({type:`nav/${status.whitespacing ? "replay" : "prev"}`})}/>

            <PlayButton size={size}  testID="play"
                whitespacing={status.whitespace} 
                disabled={status.whitespacing || controls.play===false}
                color={status.whitespacing ? color.warn : "white"}
                name={status.whitespacing ? "fiber-manual-record" : (status.isPlaying ? "pause" : "play-arrow")} 
                onPress={e=>dispatch({type:"nav/play"})}/>
            
            <PressableIcon size={size} testID="next"
                disabled={!navable||controls.next==false}
                name={controls.next==false ? "" : "keyboard-arrow-right"}
                onPress={e=>dispatch({type:"nav/next"})}/>
            
            <PressableIcon size={size} testID="check"
                disabled={!navable||controls.select==false}
                name={controls.select==false ? "" : (isChallenged ? "alarm-on" : "alarm-add")}
                onPress={e=>dispatch({type:"nav/challenge"})} 
                color={isChallenged ? "yellow" : undefined}/>
            </>)}
            {!status?.isLoaded && <ActivityIndicator  size="large"/>}
        </View>
    )
}

export function Subtitle({delay, id, item, policyName, style, ...props}){
    const {diffs}=useSelector(state=>{
        return state.talks[id]?.[policyName]?.records?.[`${item?.time}-${item?.end}`]
    })||{}
    return (
        <Text {...props} style={style}>
            {item && <Recognizer.Text key={item.text} id={item.text}>{diffPretty(diffs)}</Recognizer.Text>}
            {"\n"}
            <Delay seconds={delay}>
                <>
                    {item?.text||""}{"\n"}
                    <Text style={{fontSize:10, color:"gray"}}>{item?.my||""}</Text>
                </>
            </Delay>
        </Text>
    )
}

export function Subtitles({style,policy, itemHeight:height=80,  ...props}){
    const {status, i=status.i, chunks, setShowSubtitle}=React.useContext(Context)
    const shouldCaption=policy=="shadowing"
    const subtitleRef=React.useRef()
    React.useEffect(()=>{
        if(chunks && subtitleRef.current){
            if(i>=0 && i<chunks.length-1){
                subtitleRef.current.scrollToIndex({index:i, viewPosition:0.5})
            }
        }
    },[i])

    React.useEffect(()=>{
        setShowSubtitle(false)
        return ()=>setShowSubtitle(true)
    },[])

    return (
        <View {...props} style={[{padding:4},style]}>
            <FlatList data={chunks} 
                ref={subtitleRef}
                estimatedItemSize={height}
                getItemLayout={(data, index)=>({length:height, offset: index*height, index})}
                keyExtractor={({text,test},i)=>`${text}-${test}-${i}`}
                renderItem={({ index, item })=><SubtitleItem {...{ style:{height}, shouldCaption, index, item,}}/>}
                />
        </View>
    )
}

function SubtitleItem({shouldCaption:$shouldCaption, index, item, style}) {
    const {id, dispatch, status, current=status.i, getRecordChunkUri, policyName,controls}=React.useContext(Context)
    const color=React.useContext(ColorScheme)
    const {recognized, diffs, score}=useSelector(state=>{
        return state.talks[id]?.[policyName]?.records?.[`${item.time}-${item.end}`]
    })||{}
    const isChallenged= useSelector(state=>{
        const exist=state.talks[id]?.[policyName]?.challenges?.find(a=>a.time==item.time)
        return exist && !exist.pass
    })
    const audio=getRecordChunkUri?.(item)

    const [playing, setPlaying] = React.useState(false);
    const [audioExists, setAudioExists]=React.useState(false)
    React.useEffect(()=>{
        if(audio && recognized){
            (async()=>{
                const info=await FileSystem.getInfoAsync(audio)
                if(info.exists){
                    setAudioExists(true)
                }
            })();
        }
    },[recognized, audio])
    const textProps={
        style:{ flexGrow: 1, paddingLeft: 10, },
        adjustsFontSizeToFit:true,
        numberOfLines:2,
    }

    const [shouldCaption, setShouldCaption]=React.useState($shouldCaption)

    return (
        <View style={{ backgroundColor: index == current ? color.inactive : undefined, 
                flexDirection:"row", borderColor: "gray", borderTopWidth: 1, paddingBottom: 5, paddingTop: 5 , ...style}}>
            <View style={{width:22, justifyContent:"space-between", alignItems:"center"}}>
                <Text style={{ textAlign: "center", fontSize:10 }}>{index + 1}</Text>
                {controls.select!=false && <PressableIcon size={20} color={color.text} 
                    onPress={e=>dispatch({type:"nav/challenge",i:index})}
                    name={isChallenged ? "alarm-on" : "radio-button-unchecked"}/>}
                <Text style={{textAlign: "center",fontSize:10}}>{score||""}</Text>
            </View>
            <View style={{flex:1, flexGrow:1 }}>
                <Pressable style={{flex:1}}
                    onPressOut={e=>!$shouldCaption && setShouldCaption(false)}
                    onLongPress={e=>!$shouldCaption && setShouldCaption(true)}
                    onPress={e => dispatch({ type: "media/time", time:item.time , shouldPlay:true})}>
                    <Text {...textProps}>{shouldCaption ? item.text : ""}</Text>
                </Pressable>
                <Pressable style={{ flex:1, justifyContent:"flex-end", }}
                    onPress={e => {
                        if(!audioExists)
                            return 
                        dispatch({type:"nav/pause", callback:()=>{
                            debugger
                            setPlaying(true)
                        }})
                    }}>
                    <Recognizer.Text 
                        key={recognized}
                        id={item.text} 
                        {...textProps} 
                        style={{
                            ...textProps.style, 
                            color: playing ? color.primary : color.text
                        }}
                        children={diffPretty(diffs)}
                        />
                    {!!playing && !!audio && <PlaySound audio={audio} onEnd={e=>setPlaying(false)} />}
                </Pressable>
            </View>
        </View>
    )
}