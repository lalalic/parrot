import React, {} from 'react';
import {View, Text, ActivityIndicator, Pressable, FlatList} from "react-native"
import {shallowEqual, useSelector} from "react-redux"
import { Audio } from 'expo-av'
import { produce } from "immer"
import Slider from '@react-native-community/slider'
import * as FileSystem from "expo-file-system"
import { MaterialIcons } from '@expo/vector-icons';

import { PressableIcon, SliderIcon, PlayButton, AutoHide, Recognizer, ControlIcons, PlaySound, Recorder } from '../components';
import { ColorScheme } from './default-style';
import { diffScore, diffPretty } from '../experiment/diff';
const Context=React.createContext({})
/**
@TODO: 
1. why is it constantly rerendered although status is not changed 
 */
export default function Player({
    id, //talk id 
    media,
    style, 
    children, //customizable controls
    policyName="general", //used to get history of a policy
    policy,
    challenging,
    onPolicyChange, onCheckChunk, onRecordChunkUri, onRecordChunk, onFinish, onQuit,onRecordAudioMiss,onChallengePass,
    controls:_controls,
    transcript:_transcript,
    layoverStyle, navStyle, subtitleStyle, progressStyle,
    ...props}){
    const performanceCount=React.useRef(0)
    console.info(`player rendered ${performanceCount.current++} times`)
    
    const video=React.useRef()

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
    
    React.useEffect(()=>{
        setAutoHide(Date.now())
    },[policy.autoHide])

    const [transcript, setTranscript]=React.useState(_transcript)
    React.useEffect(()=>{
        setTranscript(_transcript)
    },[_transcript])
    
    /**
     * why not in Talk?
     * > Widget set transcript by itself
     */
    const chunks=React.useMemo(()=>{
        if(challenging){
            return (challenges||[]).filter(a=>a.score??0 <= policy.autoChallenge??0 )
        }else if(transcript && typeof(policy.chunk)=="number"){
            const paragraphs=transcript
            switch(policy.chunk){        
                case 0:
                case 1:
                    return paragraphs.map(p=>p.cues).flat()
                case 9:
                    return (paragraphs.map(p=>{
                        const text=p.cues.map(a=>a.text).join("")
                        const time=p.cues[0].time
                        const end=p.cues[p.cues.length-1].end
                        return {text,time,end}
                    }))
                case 10:
                    return ([{
                        text:paragraphs.map(a=>a.cues.map(b=>b.text).join("")).join("\n"),
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
                                text:a.map(a=>a.text).join(),
                                time:a[0].time,
                                end:a[a.length-1].end
                            }))
                    )
            }
        }
        return []
    },[id, policy.chunk, policy.autoChallenge, challenging, challenges, transcript])

    const stopOnMediaStatus=React.useRef(false)
    const setVideoStatusAsync=React.useCallback(async (status, callback)=>{
        stopOnMediaStatus.current=true
        const done = await video.current?.setStatusAsync(status)
        stopOnMediaStatus.current=false
        callback?.()
        return done
    },[])

    const [status, dispatch] = React.useReducer((state,action)=>{
        const {isPlaying, i, whitespacing, rate:currentRate, volume, lastRate}=state
        const rate=lastRate||currentRate

        function terminateWhitespace(next, newState, callback){
            whitespacing && clearTimeout(whitespacing)
            setVideoStatusAsync(next={shouldPlay:true, rate, ...next}, callback)
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

        function asyncCall(fn){
           return setTimeout(fn, 0)
        }

        const CurrentChunkPositionMillis=(I=i)=>chunks[I]?.time ?? chunks[0]?.time
        const PrevChunkPositionMillis=(I=i)=>chunks[I-1]?.time ?? chunks[0]?.time
        const NextChunkPositionMillis=(I=i)=>chunks[I+1]?.time
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
                    return (i=>terminateWhitespace(
                        {positionMillis:CurrentChunkPositionMillis(i), rate:Math.max(0.25,rate-0.25)},
                        {lastRate:rate, i}
                    ))(Math.max(i-1,0))
                case "nav/prev":
                    return (i=>terminateWhitespace(
                        {positionMillis:CurrentChunkPositionMillis(i)},
                        {i}
                    ))(Math.max(i-1,0))
                case "nav/play":
                    return terminateWhitespace({
                        shouldPlay:whitespacing ? false : !isPlaying, 
                        positionMillis: CurrentChunkPositionMillis()
                    })
                case "whitespace/end":
                case "nav/next":
                    return (i=>terminateWhitespace(
                        {positionMillis:CurrentChunkPositionMillis(i)}, 
                        {i}
                    ))((i+1)%chunks.length)
                case "nav/pause":
                    return terminateWhitespace({
                        shouldPlay:false, 
                        positionMillis: CurrentChunkPositionMillis()
                    },{}, action.callback)
                case "nav/challenge":{
                    const i=action.i ?? state.i
                    i!=-1 && asyncCall(()=>onCheckChunk?.(chunks[i]))
                    break
                }
                case "nav/challenge/pass":
                    asyncCall(()=>onChallengePass?.(chunks[action.i]))
                    break
                case "volume/toggle":
                    setVideoStatusAsync({volume:volume==0 ? .50 : 0})
                        .then(a=>changePolicy("volume",a.volume))
                break
                case "volume/tune":
                    setVideoStatusAsync({volume})
                        .then(a=>changePolicy("volume",a.volume))
                break
                case "speed/toggle":
                    setVideoStatusAsync({rate:rate==0.75 ? 1 : 0.75})
                        .then(a=>changePolicy("speed",a.rate))
                break
                case "speed/tune":
                    setVideoStatusAsync({rate:action.rate})
                        .then(a=>changePolicy("speed",a.rate))
                break
                case "record/miss":
                    asyncCall(()=>onRecordAudioMiss?.(action))
                break
                case "media/time":{
                    const i=chunks.findIndex(a=>a.time>=action.time)
                    return terminateWhitespace(
                        {positionMillis:CurrentChunkPositionMillis(i),shouldPlay:action.shouldPlay ?? isPlaying},
                        {i: i==-1 ? chunks.length-1 : i}
                    )
                }
                case "media/finished":
                    asyncCall(()=>onFinish?.())
                    return terminateWhitespace(
                        {shouldPlay:false, positionMillis:chunks[0]?.time},
                        {i:0}
                    )
                case "media/status/changed":
                    return action.state
            }

            return state
        })();
        if(!shallowEqual(nextState, state)){
            console.debug(`${action.type}: ${chunks[nextState.i]?.time}-${chunks[nextState.i]?.end}\n${JSON.stringify(nextState)}`)
        }
        return nextState
    },{isLoaded:false, i:-1});

    const controls=React.useMemo(()=>{
        return {
            ..._controls,
            ...(chunks.length==0 && {subtitle:false, record:false,video:false,caption:false,chunk:false, slow:false,prev:false,next:false,select:false}),
            ...(challenging && {chunk:false}),
        }
    },[_controls,chunks])

    /**
     * move out of reducer to bail out rerender
     */
    const onProgress=React.useRef()

    const onMediaStatus=React.useCallback((state, action)=>{
        setTimeout(()=>onProgress.current?.(action.status.positionMillis),0)
        
        if(action.status.transcript){
            setTimeout(()=>setTranscript(action.status.transcript))
        }

        const {i, whitespacing}=state
        const nextState=(()=>{
            if(stopOnMediaStatus.current // setting status async
                || action.status.shouldPlay!=action.status.isPlaying // player is ajusting play status 
                || action.status.positionMillis<=state.minPositionMillis //player offset ajustment
                || whitespacing //
            ){
                return state
            }
            
            const {status:{isLoaded,positionMillis, isPlaying,rate,volume,durationMillis=0,didJustFinish, 
                i:_i=positionMillis<=chunks[0]?.time ? -1 : chunks.findIndex(a=>a.end>=positionMillis)}}=action
            
            if(!isLoaded){//init video pitch, props can't work
                setVideoStatusAsync({shouldCorrectPitch:true,pitchCorrectionQuality:Audio.PitchCorrectionQuality.High})
                return state
            }

            const current={isLoaded,isPlaying,rate,volume,durationMillis,i:_i}

            //copy temp keys from state
            ;["lastRate"].forEach(k=>k in state && (current[k]=state[k]))

            if(positionMillis>=chunks[i]?.end && i+1==_i){//current is over
                if(policy.whitespace){
                    console.debug('whitespace/start')
                    const whitespace=policy.whitespace*(chunks[i].end-chunks[i].time)
                    setVideoStatusAsync({shouldPlay:false})
                    const whitespacing=setTimeout(()=>dispatch({type:"whitespace/end"}),whitespace+1000)
                    return {...state, whitespace, whitespacing}
                }
            }

            if(didJustFinish || (_i==-1 && i>=chunks.length-1)){
                setTimeout(()=>dispatch({type:"media/finished"}),0)
            }

            return current
        })();

        if(state!=nextState && !shallowEqual(state,nextState)){
            console.debug(`video positionMillis:  ${action.status.positionMillis}`)
            dispatch({type:"media/status/changed", state:nextState})
        }
    },[policy,chunks, challenges, challenging])
    
    const updateScore=React.useRef()
    const saveHistory=React.useRef(0)
    saveHistory.current=media.props.shouldPlay && chunks.length>0 && status.i>0 && status.i<chunks.length-1 && chunks[status.i]?.time
    React.useEffect(()=>{
        //@Hack: to play sound to speaker, otherwise always to earpod
        Audio.setAudioModeAsync({ playsInSilentModeIOS: true })
        return ()=>{
            if(saveHistory.current){
                onQuit?.({time:saveHistory.current})
            }
        }
    },[])

    const positionMillisHistory=useSelector(state=>state.talks[id]?.[policyName]?.history??0)

    const isChallenged=React.useMemo(()=>!!challenges?.find(a=>a.time==chunks[status.i]?.time),[chunks[status.i],challenges])
    
    return (
        <>
        <SliderIcon.Container 
            style={style} 
            onStartShouldSetResponder={e=>setAutoHide(Date.now())}
            {...props}>
            {React.cloneElement(media, {
                ref:video,
                onPlaybackStatusUpdate:mediaStatus =>{
                    onMediaStatus(status, {type:"media/status", status: mediaStatus})
                },
                rate:policy.rate,
                volume:policy.volume,
                style:{flex:1, minHeight:150},
                positionMillis: positionMillisHistory
            })}
            <View pointerEvents='box-none'
                style={[{position:"absolute",width:"100%",height:"100%",backgroundColor:false!=policy.visible?"transparent":"black"},layoverStyle]}>
                {false!=controls.nav && <NavBar {...{
                        controls,isChallenged,
                        dispatch,status,
                        navable:chunks?.length>=2,
                        size:32, style:[{flexGrow:1,opacity:0.5, backgroundColor:"black",marginTop:40,marginBottom:40},navStyle] }}/>}
                
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
                        slider={{minimumValue:0.5,maximumValue:1.5,step:0.25,value:status.rate,text:t=>`${t}x`}}/>}

                    {false!=controls.whitespace && <SliderIcon style={{marginRight:10}} testID="whitespace"
                        icon={policy.whitespace>0 ? ControlIcons.whitespace : "notifications-off"}
                        onToggle={()=>changePolicy("whitespace",policy.whitespace>0 ? 0 : 1)}
                        onSlideFinish={value=>changePolicy("whitespace",value)}
                        slider={{minimumValue:0.5,maximumValue:4,step:0.5,value:policy.whitespace,text:t=>`${t}x`}}/>}

                    {false!=controls.chunk && <SliderIcon style={{marginRight:10}} testID="chunk"
                        icon={policy.chunk>0 ? ControlIcons.chunk : "flash-off"}
                        onToggle={()=>changePolicy("chunk",policy.chunk>0 ? 0 : 1)}
                        onSlideFinish={get=>(dx,dy)=>changePolicy("chunk",get(dy))}
                        slider={{minimumValue:0,maximumValue:10,step:1,value:policy.chunk,text:t=>({'9':"paragraph","10":"whole"})[t+'']||`${t}s`}}/>}

                    {false!=controls.fullscreen && <PressableIcon style={{marginRight:10}} testID="fullscreen"
                        name={!policy.fullscreen ? "zoom-out-map" : "fullscreen-exit"}
                        onPress={e=>{
                            changePolicy("fullscreen", !policy.fullscreen)
                        }}/>}
                </AutoHide>

                <Subtitle 
                    i={status.i} 
                    callback={updateScore}
                    selectRecognized={state=>{
                        const a=chunks?.[status.i];
                        return state.talks[id]?.[policyName]?.records?.[`${a?.time}-${a?.end}`]
                    }}
                    style={{width:"100%",textAlign:"center",position:"absolute",bottom:20,fontSize:20,...subtitleStyle}}
                    title={false!=controls.subtitle ? chunks[status.i]?.text : ""}
                    my={chunks[status.i]?.my}
                    autoChallenge={policy.autoChallenge}
                    numberOfLines={2}
                    adjustsFontSizeToFit={true}
                    delay={policy.captionDelay} 
                    //score={<Score length={chunks.length} callback={updateScore}/>}
                    show={policy.caption}>
                    {status.whitespacing && <Recognizer key={status.i} i={status.i}
                        onRecord={props=>{
                                const {i, chunk=chunks[i], recognized=props.recognized}=status
                                const score=diffScore(chunk.text,recognized)
                                updateScore.current?.(score)
                                if(policy.autoChallenge){    
                                    if(score<policy.autoChallenge){
                                        if(!challenging){
                                            if(!challenges?.find(a=>a.time==chunk.time)){
                                                onCheckChunk?.(chunks[i])
                                            }
                                        }else {
                                            //dispatch({})
                                        }
                                    }else {
                                        if(challenging){
                                            onChallengePass?.(chunks[i])
                                        }
                                    }
                                }
                                if(recognized){
                                    policy.record && onRecordChunk?.({type:"record",score,chunk,...props})
                                }

                        }} 
                        uri={onRecordChunkUri?.(chunks[status.i])}
                        />}
                </Subtitle>

                <AutoHide hide={autoHideProgress} style={[{position:"absolute",bottom:0, width:"100%"},progressStyle]}>
                    <ProgressBar {...{
                        onProgress,
                        duration:status.durationMillis,
                        onValueChange:time=>dispatch({type:"media/time", time:Math.floor(time)}),
                        onSlidingStart:e=>setAutoHide(Date.now()+2*60*1000),
                        onSlidingComplete:e=>setAutoHide(Date.now())
                    }}/> 
                </AutoHide>
            </View>
        </SliderIcon.Container>
        {!policy.fullscreen && <Context.Provider value={{id, status, chunks, dispatch, onRecordChunkUri, policy:policyName, $policy:policy}}>
            {children}
        </Context.Provider>}
        <Recorder style={{position:"absolute", right:20, bottom:100}} onStart={callback=>dispatch({type:"nav/pause",callback})}/>
        </>
    )
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
                disabled={status.whitespacing}
                color={status.whitespacing ? color.warn : undefined}
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

export function Subtitle({show,i,delay,title,my, selectRecognized, children, style, score,  ...props}){
    const color=React.useContext(ColorScheme)
    const [text, setText]=React.useState(title)
    const recognized=useSelector(selectRecognized)
    const [showMy, setShowMy]=React.useState(false)

    const [$title, $children]=React.useMemo(()=>{
        if(!show || Subtitle.shouldHide)
            return ["",children]
        if(!children && recognized){
            const diffs=diffPretty(title, recognized)
            return [
                diffs[0],
                <Text {...props} children={diffs[1]} style={[style, {bottom:style.bottom+40}]}/>
            ]
        }
        return [
            text, 
            React.isValidElement(children) && React.cloneElement(children,{...props, style:[style, {bottom:style.bottom+40}]})
        ]
    },[recognized, text, children, show])

    React.useEffect(()=>{
        if(!show){
            setText("")
        }else{
            if(delay){
                setTimeout(()=>setText(title),delay*1000)
            }else{
                setText(title)
            }
        }
    },[i, show])
    return (
        <>
            {!Subtitle.shouldHide  && <Pressable onPressIn={e=>!!my && setShowMy(true)} onPressOut={e=>setShowMy(false)}>
                {!!my && <MaterialIcons name="translate" size={20} color={color.primary} style={{position:"absolute", left:10, top:-60, opacity:0.6}}/>}
                {score && <Text style={{position:"absolute", right:10, top:-60, opacity:0.6}}>{score}</Text>}
                <Text {...props} style={style}>
                    {showMy ? my : $title}
                </Text>
            </Pressable>}
            {$children}
        </>
    )
}

export function Subtitles({style,policy, itemHeight:height=80,  ...props}){
    const {id, status, i=status.i, chunks, onRecordChunkUri}=React.useContext(Context)
    const {challenges=[],records=[]}=useSelector(state=>({
        challenges:state.talks[id]?.[policy]?.challenges, 
        records:state.talks[id]?.[policy]?.records,
    }))

    const shouldCaption=policy=="shadowing"
    
    const subtitleRef=React.useRef()
    React.useEffect(()=>{
        if(i>=0 && subtitleRef.current && i<chunks.length-1){
            subtitleRef.current.scrollToIndex({index:i, viewPosition:0.5})
        }
    },[i])

    React.useEffect(()=>{
        Subtitle.shouldHide=true
        return ()=>delete Subtitle.shouldHide
    },[])

    return (
        <View {...props} style={[{padding:4},style]}>
            <FlatList data={chunks} 
                ref={subtitleRef}
                extraData={`${i}-${challenges.length}-${records?.changed}`} 
                estimatedItemSize={height}
                getItemLayout={(data, index)=>({length:height, offset: index*height, index})}
                keyExtractor={({time,end})=>`${time}-${end}-${records[`${time}-${end}`]}`}
                renderItem={({ index, item })=><SubtitleItem {...{
                    style:{height}, shouldCaption,
                    index, item, 
                    audio:onRecordChunkUri?.(item),
                    recognized:records[`${item.time}-${item.end}`],
                    isChallenged: !!challenges.find(a=>a.time==item.time)
                }}/>}
                />
        </View>
    )
}

function SubtitleItem({audio, recognized, shouldCaption:$shouldCaption, index, item, isChallenged, style}) {
    const {dispatch, status, current=status.i}=React.useContext(Context)
    const color=React.useContext(ColorScheme)
    const [playing, setPlaying] = React.useState(false);
    const { text, time, end } = item;
    const [audioExists, setAudioExists]=React.useState(false)
    React.useEffect(()=>{
        if(audio && recognized){
            (async()=>{
                const info=await FileSystem.getInfoAsync(audio)
                if(info.exists){
                    setAudioExists(true)
                }else{
                    dispatch({type:"record/miss", record: item })
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

    const [$text, $recognized]=React.useMemo(()=>diffPretty(text, recognized),[text, recognized])
    return (
        <View style={{ backgroundColor: index == current ? color.inactive : undefined, 
                flexDirection:"row", borderColor: "gray", borderTopWidth: 1, paddingBottom: 5, paddingTop: 5 , ...style}}>
            <View style={{width:20, justifyContent:"space-between", alignItems:"center"}}>
                <Text style={{ textAlign: "center", fontSize:10 }}>{index + 1}</Text>
                <PressableIcon size={20} color={color.text}
                    onPress={e=>dispatch({type:"nav/challenge",i:index})}
                    name={isChallenged ? "alarm-on" : "radio-button-unchecked"}/>
                <Text style={{textAlign: "center",fontSize:10}}>{!!recognized ? diffScore(text, recognized) : ""}</Text>
            </View>
            <View style={{flex:1, flexGrow:1 }}>
                <Pressable style={{flex:1}}
                    onPressOut={e=>!$shouldCaption && setShouldCaption(false)}
                    onLongPress={e=>!$shouldCaption && setShouldCaption(true)}
                    onPress={e => dispatch({ type: "media/time", time , shouldPlay:true})}>
                    <Text {...textProps}>{shouldCaption ? $text : ""}</Text>
                </Pressable>
                <Pressable style={{ flex:1, justifyContent:"flex-end" }}
                    onPress={e => {
                        if(audioExists){
                            dispatch({type:"nav/pause", callback:()=>setPlaying(true)})
                        }
                    }}>
                    <Recognizer.Text i={index} {...textProps} 
                        style={{
                            ...textProps.style, 
                            color: playing ? "red" : color.primary
                        }}>{$recognized}</Recognizer.Text>
                    {!!playing && !!audio && <PlaySound audio={audio} destroy={setPlaying} />}
                </Pressable>
            </View>
        </View>
    )
}