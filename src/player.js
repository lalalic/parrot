import React, {} from 'react';
import {View, Text, ActivityIndicator, Pressable, FlatList} from "react-native"
import {shallowEqual, useSelector} from "react-redux"
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider'
import * as FileSystem from "expo-file-system"

import { PressableIcon, SliderIcon, PlayButton, AutoHide, Recognizer, ControlIcons, PlaySound } from './components';
import { ColorScheme } from './default-style';
//import {FlashList as FlatList}  from "@shopify/flash-list"
const Context=React.createContext({})
const undefinedy=(o)=>(Object.keys(o).forEach(k=>o[k]===undefined && delete o[k]),o)

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
    onPolicyChange, onCheckChunk, onRecordChunkUri, onRecordChunk, onFinish, onQuit,onRecordAudioMiss,
    controls:_controls,
    transcript:_transcript,
    layoverStyle, navStyle, subtitleStyle, progressStyle,
    ...props}){
    const performanceCount=React.useRef(0)
    performanceCount.current++
    console.log(`rendered ${performanceCount.current}`)
    
    const changePolicy=(key,value)=>onPolicyChange?.({[key]:value})
    const color=React.useContext(ColorScheme)
    const video=React.useRef()

    const challenges=useSelector(state=>state.talks[id]?.[policyName]?.challenges)
    const autoHideActions=React.useRef()
    const autoHideProgress=React.useRef()
    const setAutoHide=React.useCallback((time)=>{
        autoHideProgress.current?.(time)
        autoHideActions.current?.(policy.autoHide ? time : false)
    },[policy.autoHide])

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
            return challenges||[]
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
    },[id, policy.chunk, challenging, challenges, transcript])

    const [status, dispatch] = React.useReducer((state,action)=>{
        console.log(action.type)
        const {isPlaying, i, whitespacing, rate:currentRate, volume, lastRate}=state
        const rate=lastRate||currentRate

        function terminateWhitespace(next, newState, needClearTimeout=true){
            if(whitespacing && needClearTimeout){
                clearTimeout(whitespacing)
            }
            setTimeout(()=>video.current.setStatusAsync({shouldPlay:true, rate, ...next}),0)
            state=undefinedy({...state, whitespace:undefined, whitespacing:undefined, lastRate:undefined,...newState})
            if(next?.positionMillis)
                state.minPositionMillis=next.positionMillis
            return state
        }
        switch(action.type){
            case "nav/replaySlow":
                return terminateWhitespace(
                    {positionMillis:chunks[i].time,rate:Math.max(0.25,rate-0.25)},
                    {lastRate:rate}
                )
            case "nav/replay":
                return terminateWhitespace({positionMillis:chunks[i].time},{canReplay:state.canReplay-1})
            case "nav/prevSlow":
                return terminateWhitespace(
                    i>1 ? {positionMillis:chunks[i-1].time,rate:Math.max(0.25,rate-0.25)} : undefined,
                    {lastRate:rate}
                )
            case "nav/prev":
                return terminateWhitespace(
                    i>0 ? {positionMillis:chunks[i-1].time} : undefined
                )
            case "nav/play":
                return terminateWhitespace(
                    {shouldPlay:!isPlaying, positionMillis: i==-1 ? 0 : undefined}
                )
            case "nav/next":
                return terminateWhitespace(
                    i<chunks.length-1 ? {positionMillis:chunks[i+1].time} : undefined, 
                    {i:i+1}
                )
            case "nav/challenge":{
                const i=action.i!=undefined ? action.i : state.i
                i!=-1 && onCheckChunk?.(chunks[i])
                break
            }
            case "whitespace/end":{
                return terminateWhitespace(
                    (challenging ? {positionMillis:chunks[i+1]?.time} : undefined),
                    {i:i+1,minPositionMillis:chunks[i+1]?.time},
                    false//don't need clear whitespace timeout
                )
            }
            case "volume/toggle":
                video.current.setStatusAsync({volume:volume==0 ? .50 : 0})
                    .then(a=>changePolicy("volume",a.volume))
            break
            case "volume/tune":
                video.current.setStatusAsync({volume})
                    .then(a=>changePolicy("volume",a.volume))
            break
            case "speed/toggle":
                video.current.setStatusAsync({rate:rate==0.75 ? 1 : 0.75})
                    .then(a=>changePolicy("speed",a.rate))
            break
            case "speed/tune":
                video.current.setStatusAsync({rate:action.rate})
                    .then(a=>changePolicy("speed",a.rate))
            break
            case "record":
                policy.record && onRecordChunk?.(action)
            break
            case "record/miss":
                onRecordAudioMiss?.(action)
            break
            case "media/time":
                return terminateWhitespace({positionMillis:action.time})
            case "media/finished":
                onFinish?.()
                return terminateWhitespace({shouldPlay:false, positionMillis:chunks[0]?.time})
            break
            case "media/status/changed":
                return action.state
        }
        return state
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
        const {isPlaying, i, whitespacing, rate:currentRate, volume, lastRate, minPositionMillis}=state
        const nextState=(()=>{
            if(action.status.transcript){
                setTimeout(()=>setTranscript(action.status.transcript))
            }

            if(whitespacing)//don't update until whitespacing is over
                return state
            
            const {status:{isLoaded,positionMillis,isPlaying,rate,volume,durationMillis,didJustFinish, i:_i=chunks.findIndex(a=>a.end>=positionMillis)}}=action
            if(!isLoaded){//init video pitch, props can't work
                video.current?.setStatusAsync({shouldCorrectPitch:true,pitchCorrectionQuality:Audio.PitchCorrectionQuality.High})
                return state
            }

            if(minPositionMillis>positionMillis){
                return state
            }

            const current={isLoaded,isPlaying,rate,volume,durationMillis,i:_i}

            //copy temp keys from state
            ;["lastRate"].forEach(k=>k in state && (current[k]=state[k]))

            if(positionMillis>=chunks[i]?.end && (i+1==_i || i==chunks.length-1)){//current is over
                if(policy.whitespace){
                    console.log('whitespace/start')
                    const whitespace=policy.whitespace*(chunks[i].end-chunks[i].time)
                    video.current.setStatusAsync({shouldPlay:false})
                    const whitespacing=setTimeout(()=>dispatch({type:"whitespace/end"}),whitespace)
                    return {...state, whitespace, whitespacing}
                }
            }

            if(didJustFinish || (_i==-1 && i>=chunks.length-1)){
                setTimeout(()=>dispatch({type:"media/finished"}),0)
            }

            return current
        })();
        if(state!=nextState && !shallowEqual(state,nextState)){
            dispatch({type:"media/status/changed", state:nextState})
        }
    },[policy,chunks, challenges, challenging])
    

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

    const positionMillisHistory=useSelector(state=>state.talks[id]?.[policyName]?.history)

    const isChallenged=React.useMemo(()=>!!challenges?.find(a=>a.time==chunks[status.i]?.time),[chunks[status.i],challenges])
    return (
        <>
        <SliderIcon.Container 
            style={{width:"100%",...style}} 
            onStartShouldSetResponder={e=>setAutoHide(Date.now())}
            {...props}>
            {React.cloneElement(media, {
                ref:video,
                onPlaybackStatusUpdate:mediaStatus =>{
                    try{
                        onMediaStatus(status, {type:"media/status", status: mediaStatus})
                    }catch(e){
                        console.error(e)
                    }
                },
                rate:policy.rate,
                volume:policy.volume,
                positionMillis: positionMillisHistory||chunks[0]?.time
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
                        color={policy.record && status.whitespacing ? color.warn : undefined}
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

                    {false!=controls.maximize && <PressableIcon style={{marginRight:10}} name="zoom-out-map" testID="fullscreen"
                        onPress={e=>dispatch({type:'media/fullscreen'})}/>}
                </AutoHide>

                <Subtitle 
                    i={status.i} 
                    style={[{width:"100%",textAlign:"center",position:"absolute",bottom:20,fontSize:20},subtitleStyle]}
                    title={false!=controls.subtitle ? chunks[status.i]?.text : ""}
                    delay={policy.captionDelay} 
                    show={policy.caption}>
                    {status.whitespacing && <Recognizer key={status.i} i={status.i}
                        style={{width:"100%",textAlign:"center",position:"absolute",bottom:60,fontSize:20}}
                        onRecord={({recognized,...props})=>{
                            let score=undefined, i=status.i
                            const chunk=chunks[status.i]
                            /*
                            if(policy.autoChallenge){//@NOTE: chunk[i+1] is playing
                                if((score=diff(chunks[i].text,recognized))<policy.autoChallenge){
                                    if(status.canReplay>0){
                                        dispatch({type:"nav/prev"})
                                        return 
                                    }else if(!challenging && !challenges?.find(a=>a.time==chunks[i].time)){
                                        dispatch({type:"nav/challenge", i:i-1})
                                    }
                                }else if(challenging){
                                    dispatch({type:"nav/challenge",i:i-1})
                                }
                            }
                            */
                            dispatch({type:"record",recognized,score,chunk,...props})
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
        <Context.Provider value={{id, status, chunks, dispatch, onRecordChunkUri, policy:policyName}}>
            {children}
        </Context.Provider>
        </>
    )
}

export function Subtitle({show,i,delay,title, children, ...props}){
    const [text, setText]=React.useState(title)
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
            <Text {...props}>
                {text}
            </Text>
            {children}
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

export function Subtitles({style,policy, itemHeight:height=70, onLongPress, ...props}){
    const {id, status, i=status.i, chunks, onRecordChunkUri}=React.useContext(Context)
    const {challenges=[],records=[]}=useSelector(state=>({
        challenges:state.talks[id]?.[policy]?.challenges, 
        records:state.talks[id]?.[policy]?.records,
    }))
    
    const subtitleRef=React.useRef()
    React.useEffect(()=>{
        if(i>=0 && subtitleRef.current){
            subtitleRef.current.scrollToIndex({index:i, viewPosition:0.5})
        }
    },[i])
    

    return (
        <View {...props} style={[{padding:4},style]}>
            <FlatList data={chunks} 
                ref={subtitleRef}
                extraData={`${i}-${challenges.length}`} 
                estimatedItemSize={height+10}
                getItemLayout={(data, index)=>({length:height+10, offset: index*(height+10), index})}
                keyExtractor={({time,end})=>`${time}-${end}`}
                renderItem={({ index, item })=><SubtitleItem {...{
                    style:{height},
                    index, item, onLongPress,
                    audio:onRecordChunkUri?.(item),
                    recognized:records[`${item.time}-${item.end}`],
                    isChallenged: !!challenges.find(a=>a.time==item.time)
                }}/>}
                />
        </View>
    )
}

function SubtitleItem({audio, recognized, onLongPress, index, item, isChallenged, style}) {
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
    return (
        <View style={{ borderColor: "gray", borderTopWidth: 1, marginTop: 10, paddingTop: 10 , ...style}}>
            <Pressable style={{ flexDirection: "row", marginBottom: 10, alignContent:"center" }}
                onLongPress={e => onLongPress?.(item)}
                onPress={e => dispatch({ type: "media/time", time })}>
                <Text style={{ width: 20, textAlign: "center", fontSize:10,
                    color: index == current ? color.primary : color.text }}>{index + 1}</Text>
                <Text style={{ flexGrow: 1, paddingLeft: 10 }}>{text.replace("\n", " ")}</Text>
            </Pressable>
            <Pressable style={{ marginTop: 3, flexDirection: "row" }}
                onLongPress={e => onLongPress?.(item)}
                onPress={e => audioExists && setPlaying(true)}>
                <PressableIcon size={20} 
                    onPress={e=>dispatch({type:"nav/challenge",i:index})}
                    name={isChallenged ? "alarm-on" : "radio-button-unchecked"}/>
                <Recognizer.Text i={index} style={{ color: playing ? "red" : (audioExists ? color.primary : color.inactive), lineHeight: 20, paddingLeft: 10 }}>{recognized}</Recognizer.Text>
                {!!playing && !!audio && <PlaySound audio={audio} onFinish={e =>setPlaying(false)} />}
            </Pressable>
        </View>
        )
}

function diff(source,recognized){
    source=source.split(/\s+/g)
    const recognizedWords=recognized.split(/\s+/g).reduce((score,a,i,)=>{
        return score+(source.includes(a) ? 1 : 0)
    },0)

    return Math.ceil(100*recognizedWords/source.length)
}