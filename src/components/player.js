import React, {} from 'react';
import {View, Text, ActivityIndicator, Pressable, FlatList} from "react-native"
import {shallowEqual, useSelector} from "react-redux"
import { Audio } from 'expo-av'
import { produce } from "immer"
import Slider from '@react-native-community/slider'
import * as FileSystem from "expo-file-system"
import * as Sharing from "expo-sharing"
import * as ImagePicker from "expo-image-picker"
import { useKeepAwake} from "expo-keep-awake"


import { SliderIcon, PlayButton, AutoHide, Recognizer, ControlIcons, PlaySound, Recorder } from '../components';
import PressableIconA from "react-native-use-qili/components/PressableIcon";
import { ColorScheme } from 'react-native-use-qili/components/default-style';
import { diffScore, diffPretty } from '../experiment/diff';
const Context=React.createContext({})
const asyncCall=fn=>setTimeout(fn, 0)

const PressableIcon=({color="gray",...props})=><PressableIconA {...props} color={color}/>
/**
 * 2 models: with or without transcript
 * cue: {text(audio, caption, subtitles), test=text(recognze, diff), time, end}
@TODO: 
1. why is it constantly rerendered although status is not changed 
 */
export default function Player({
    id, //talk id 
    media,
    style, title,
    children, //customizable controls
    policyName="general", //used to get history of a policy
    policy,
    challenging,
    toggleChallengeChunk,addChallengeChunk, removeChallengeChunk, 
    onPolicyChange, onRecordChunkUri, onRecordChunk, onFinish, onQuit,onChallengePass,
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

    const [transcript, setTranscript]=React.useState(_transcript)
    
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
                case 1:{
                    if(policy.fullscreen){
                        const i=paragraphs.findIndex(p=>p.cues[p.cues.length-1]?.end*2.5>=5*60*1000)
                        if(i!=-1){
                            return paragraphs.slice(0,i).map(p=>p.cues).flat()
                        }
                    }    
                    return paragraphs.map(p=>p.cues).flat()
                }
                case 9:
                    return (paragraphs.map(p=>{
                        const text=p.cues.map(a=>a.text).join("")
                        const time=p.cues[0].time
                        const end=p.cues[p.cues.length-1]?.end
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
    },[id, policy.chunk, policy.autoChallenge, policy.fullscreen, challenging, challenges, transcript])

    const stopOnMediaStatus=React.useRef(false)
    const setVideoStatusAsync=React.useCallback(async (status, callback)=>{
        console.debug(status)
        stopOnMediaStatus.current=true
        const done = await video.current?.setStatusAsync(status)
        stopOnMediaStatus.current=false
        callback?.()
        return done
    },[])

    const [status, dispatch] = React.useReducer((state,action)=>{
        const {isPlaying, i, whitespacing, rate:currentRate, lastRate}=state
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
                    i!=-1 && asyncCall(()=>toggleChallengeChunk?.(chunks[i]))
                    break
                }
                case "speed/toggle":
                    setVideoStatusAsync({rate:rate==0.75 ? 1 : 0.75})
                        .then(a=>changePolicy("speed",a.rate))
                break
                case "speed/tune":
                    setVideoStatusAsync({rate:action.rate})
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
                case "media/finished":
                    if(!policy.fullscreen){
                        asyncCall(()=>onFinish?.())
                    }
                    asyncCall(()=>onProgress.current?.(0))
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
            console.debug(`${action.type}: ${chunks[nextState.i]?.time||""}-${chunks[nextState.i]?.end||""}\n${JSON.stringify(nextState)}`)
        }
        return nextState
    },{isLoaded:false, i:-1, durationMillis:0});

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
                setVideoStatusAsync({shouldCorrectPitch:true,pitchCorrectionQuality:Audio.PitchCorrectionQuality.High})
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
                    console.debug('whitespace/start')
                    const whitespace=policy.whitespace*(chunks[i].duration||(chunks[i].end-chunks[i].time))
                    setVideoStatusAsync({shouldPlay:false})
                    const whitespacing=setTimeout(()=>dispatch({type:!isLast ? "whitespace/end" : "media/finished"}),whitespace+1000)
                    return {...state, whitespace, whitespacing}
                }
            }

            if(didJustFinish || isLast){
                asyncCall(()=>dispatch({type:"media/finished"}))
            }

            return current
        })();

        if(state!=nextState && !shallowEqual(state,nextState)){
            dispatch({type:"media/status/changed", state:nextState})
        }
    },[policy,chunks, challenges, challenging])
    
    const saveHistory=React.useRef(0)
    saveHistory.current=chunks[status.i]?.time
    React.useEffect(()=>{
        return ()=>{
            if(saveHistory.current && !policy.fullscreen){
                onQuit?.({time:saveHistory.current})
            }
        }
    },[])

    const positionMillisHistory=useSelector(state=>state.talks[id]?.[policyName]?.history??0)

    const isChallenged=React.useMemo(()=>!!challenges?.find(a=>a.time==chunks[status.i]?.time),[chunks[status.i],challenges])

    const onRecord=React.useCallback(props=>{
            const {i, chunk=chunks[i], recognized=props.recognized}=status
            if(!chunk)
                return 
            const score=diffScore(chunk.text,recognized)
            
            if(policy.autoChallenge){
                if(score<policy.autoChallenge){
                    if(!challenging){
                        addChallengeChunk?.(chunk)
                    }
                }else {
                    if(challenging){
                        removeChallengeChunk?.(chunk)
                    }
                }
            }

            if(recognized){
                policy.record && onRecordChunk?.({type:"record",score,chunk,...props})
            }
    },[status.i,chunks,policy.record, policy.autoChallenge])
    
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
                    onMediaStatus(status, {type:"media/status", status: mediaStatus})
                },
                rate:policy.rate,
                style:{flex:1, minHeight:150},
                positionMillis: positionMillisHistory,
                fullscreen: policy.fullscreen,
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
                        <Recognizer key={status.i} i={status.i} 
                            locale={chunks[status.i]?.recogMyLocale}
                            onRecord={onRecord}  
                            style={{width:"100%",textAlign:"center",fontSize:16}}
                            uri={chunks[status.i] && onRecordChunkUri?.(chunks[status.i])} 
                            />
                    }

                    {showSubtitle && policy.caption && false!=controls.subtitle && 
                    <Subtitle 
                        testID="subtitle"
                        i={status.i} 
                        selectRecognized={(state,i, a=chunks[i])=>state.talks[id]?.[policyName]?.records?.[`${a?.time}-${a?.end}`]}
                        style={{width:"100%",textAlign:"center",fontSize:16, ...subtitleStyle}}
                        title={chunks[status.i]?.text||""}
                        my={chunks[status.i]?.my}
                        autoChallenge={policy.autoChallenge}
                        numberOfLines={4}
                        adjustsFontSizeToFit={true}
                        delay={policy.captionDelay}
                        children={null}
                        />
                    }

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
            </View>
        </SliderIcon.Container>
        {!policy.fullscreen && <Context.Provider value={{id, status, chunks, dispatch, setShowSubtitle, onRecordChunkUri, policy:policyName, $policy:policy}}>
            {children}
        </Context.Provider>}
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

export function Subtitle({i,delay,title,my, selectRecognized, style, score,  ...props}){
    const [text, setText]=React.useState(title)
    const recognized=useSelector(state=>selectRecognized(state, i))

    const $title=React.useMemo(()=>{
        if(recognized){
            const [label, , score]=diffPretty(title, recognized)
            return (score&&score!=100 ? `${score}: ` : '')+label
        }
        return text
    },[recognized, text])

    React.useEffect(()=>{
        if(delay){
            setText("")
            setTimeout(()=>setText(title),delay*1000)
        }else{
            setText(title)
        }
    },[i])

    return (
        <Text {...props} style={style}>
            {$title||""} {"\n"}
            <Text style={{fontSize:10, color:"gray"}}>{my||""}</Text>
        </Text>
    )
}

export function Subtitles({style,policy, itemHeight:height=80,  ...props}){
    const {id, status, i=status.i, chunks, onRecordChunkUri, setShowSubtitle}=React.useContext(Context)
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
        setShowSubtitle(false)
        return ()=>setShowSubtitle(true)
    },[])

    return (
        <View {...props} style={[{padding:4},style]}>
            {height && <FlatList data={chunks} 
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
                />}
            {!height && testHeight}
        </View>
    )
}

function SubtitleItem({audio, recognized, shouldCaption:$shouldCaption, index, item, isChallenged, style}) {
    const {dispatch, status, current=status.i}=React.useContext(Context)
    const color=React.useContext(ColorScheme)
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

    const [$text, $recognized, score]=React.useMemo(()=>diffPretty(item.text, recognized),[item.text, recognized])
    return (
        <View style={{ backgroundColor: index == current ? color.inactive : undefined, 
                flexDirection:"row", borderColor: "gray", borderTopWidth: 1, paddingBottom: 5, paddingTop: 5 , ...style}}>
            <View style={{width:20, justifyContent:"space-between", alignItems:"center"}}>
                <Text style={{ textAlign: "center", fontSize:10 }}>{index + 1}</Text>
                <PressableIcon size={20} color={color.text}
                    onPress={e=>dispatch({type:"nav/challenge",i:index})}
                    name={isChallenged ? "alarm-on" : "radio-button-unchecked"}/>
                <Text style={{textAlign: "center",fontSize:10}}>{!!recognized ? diffScore(item.text, recognized) : ""}</Text>
            </View>
            <View style={{flex:1, flexGrow:1 }}>
                <Pressable style={{flex:1}}
                    onPressOut={e=>!$shouldCaption && setShouldCaption(false)}
                    onLongPress={e=>!$shouldCaption && setShouldCaption(true)}
                    onPress={e => dispatch({ type: "media/time", time:item.time , shouldPlay:true})}>
                    <Text {...textProps}>{shouldCaption ? $text : ""}</Text>
                </Pressable>
                <Pressable style={{ flex:1, justifyContent:"flex-end", }}
                    onPress={e => {
                        if(audioExists){
                            dispatch({type:"nav/pause", callback:()=>setPlaying(true)})
                        }
                    }}>
                    <Recognizer.Text i={index} {...textProps} 
                        style={{
                            ...textProps.style, 
                            color: playing ? "red" : color.primary
                        }}>{score&&score!=100 ? `${score}: ` : ''}{$recognized}</Recognizer.Text>
                    {!!playing && !!audio && <PlaySound audio={audio} onEnd={e=>setPlaying(false)} />}
                </Pressable>
            </View>
        </View>
    )
}