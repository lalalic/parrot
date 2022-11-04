import React, {} from 'react';
import {View, Text, ActivityIndicator, Pressable} from "react-native"
import {shallowEqual, useSelector} from "react-redux"
import { Video, Audio } from 'expo-av';
import Slider from '@react-native-community/slider'
import * as FileSystem from "expo-file-system"
import Voice from "@react-native-voice/voice"
import { MaterialIcons } from '@expo/vector-icons';


import { PressableIcon, SliderIcon, PlayButton, AutoHide } from './components';
import {FlashList as FlatList} from "@shopify/flash-list"
import { useParams } from 'react-router-native';
import { ColorScheme } from './default-style';

const Context=React.createContext({})
const undefinedy=(o)=>(Object.keys(o).forEach(k=>o[k]===undefined && delete o[k]),o)
export default function Player({talk, style, children, policy, challenging,
    onPolicyChange, onCheckChunk, onRecordChunkUri, onRecordChunk, onFinish, autoplay, 
    controls:{nav=true, subtitle=true, progress=true}={},
    videoStyle={flex:1}, layoverStyle, navStyle, subtitleStyle, progressStyle,
    ...props}){
    const changePolicy=(key,value)=>onPolicyChange({[key]:value})
    const color=React.useContext(ColorScheme)
    const video=React.useRef()
    const refProgress=React.useRef()
    const {policy:policyName}=useParams()
    const [chunks, setChunks]=React.useState([])
    const [autoHide, setAutoHide]=React.useReducer((state,time)=>{
        return {actions:policy.autoHide ? time : false, progress:time}
    },{actions:policy.autoHide ? Date.now() : false, progress:Date.now()})
    const challenges=useSelector(state=>state.talks[talk.id]?.[policyName]?.challenges)

    React.useEffect(()=>{
        setAutoHide(Date.now())
    },[policy.autoHide])
    
    React.useEffect(()=>{
        if(challenging){
            setChunks(challenges||[])
            return 
        }else if(talk.languages && typeof(policy.chunk)=="number"){
            const paragraphs=talk.languages.en.transcript
            switch(policy.chunk){        
                case 0:
                case 1:
                    setChunks(paragraphs.map(p=>p.cues).flat())
                break
                case 9:
                    setChunks(paragraphs.map(p=>{
                        const text=p.cues.map(a=>a.text).join("")
                        const time=p.cues[0].time
                        const end=p.cues[p.cues.length-1].end
                        return {text,time,end}
                    }))
                break
                case 10:
                    setChunks([{
                        text:paragraphs.map(a=>a.cues.map(b=>b.text).join("")).join("\n"),
                        time:paragraphs[0].cues[0].time,
                        end:status.durationMillis
                    }])
                break
                default:
                    setChunks(
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
    },[talk, policy.chunk, challenging, challenges])

    const [status, dispatch] = React.useReducer((state,action)=>{
        const {isPlaying, i, whitespacing, rate:currentRate, volume, lastRate}=state
        const rate=lastRate||currentRate

        function terminateWhitespace(next, newState, needClearTimeout=true){
            if(whitespacing && needClearTimeout){
                clearTimeout(whitespacing)
            }

            video.current?.setStatusAsync({shouldPlay:true, rate, ...next})
            return undefinedy({...state, whitespace:undefined, whitespacing:undefined, lastRate:undefined,...newState})
        }

        switch(action.type){
            case "nav/replaySlow":
                return terminateWhitespace({positionMillis:chunks[i].time,rate:Math.max(0.25,rate-0.25)},{lastRate:rate})
            case "nav/replay":
                return terminateWhitespace({positionMillis:chunks[i].time})
            case "nav/prevSlow":
                return terminateWhitespace(i>1 ? {positionMillis:chunks[i-1].time,rate:Math.max(0.25,rate-0.25)} : undefined,{lastRate:rate})
            case "nav/prev":
                return terminateWhitespace(i>1 ? {positionMillis:chunks[i-1].time} : undefined)
            case "nav/play":
                return terminateWhitespace({shouldPlay:!isPlaying})
            case "nav/next":
                return terminateWhitespace(i<chunks.length-1 ? {positionMillis:chunks[i+1].time} : undefined, {byNext:true})
            case "nav/challenge":
                i!=-1 && onCheckChunk?.(chunks[i])
            break
            case "whitespace/end":
                return terminateWhitespace(challenging ? {positionMillis:chunks[i+1].start} : undefined,{i:i+1},false)
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
                policy.record && onRecordChunk?.({chunk:chunks[i],...action})
            break
            case "video/time":
                video.current.setStatusAsync({positionMillis:action.time})
            break
            case "video/status":{
                if(whitespacing)//don't update until whitespacing is over
                    return state
                
                const {status:{isLoaded,positionMillis,isPlaying,rate,volume,durationMillis,didJustFinish}}=action
                if(!isLoaded)
                    return state

                const current={isLoaded,isPlaying,rate,volume,durationMillis,i:chunks.findIndex(a=>a.end>=positionMillis), }

                //copy temp keys from state
                ;["lastRate","byNext"].forEach(k=>k in state && (current[k]=state[k]))

                if(shallowEqual(state, current)){
                    return state
                }
                
                if(positionMillis>=chunks[i]?.end){//current is over
                    if(policy.whitespace && !state.byNext){
                        const whitespace=policy.whitespace*(chunks[i].end-chunks[i].time)
                        const whitespacing=setTimeout(()=>dispatch({type:"whitespace/end"}),whitespace)
                        video.current.setStatusAsync({shouldPlay:false, positionMillis})
                        return {...state, whitespace, whitespacing}
                    }

                    if(state.byNext){
                        delete current.byNext
                        delete state.byNext
                    }
                }

                if(didJustFinish){
                    onFinish?.()
                }

                current.ic=challenging ? i : challenges?.findIndex(a=>a.time==chunks[current.i]?.time)
                return current
            }
        }
        return state
    },{isLoaded:false, i:-1});

    return (
        <>
        <SliderIcon.Container 
            style={{width:"100%",...style}} 
            onStartShouldSetResponder={e=>setAutoHide(Date.now())}
            {...props}>
            <Video ref={video}
                style={videoStyle} 
                posterSource={{uri:talk.thumb}}
                source={{uri:talk.resources?.hls.stream}}
                useNativeControls={false}
                shouldPlay={autoplay}
                shouldCorrectPitch={true}
                progressUpdateIntervalMillis={100}
                onPlaybackStatusUpdate={status =>{
                    refProgress.current?.(status.positionMillis)//always keep progress bar synced up to video position
                    dispatch({type:"video/status", status})
                }}
                rate={policy.rate}
                volume={policy.volume}
                />
            <View style={[{position:"absolute",width:"100%",height:"100%",backgroundColor:policy.visible?"transparent":"black"},layoverStyle]}>
                {nav && <NavBar {...{
                        dispatch,status,
                        navable:chunks?.length>=2,
                        size:32, style:[{flexGrow:1,opacity:0.5, backgroundColor:"black",marginTop:40,marginBottom:40},navStyle] }}/>}
                
                <AutoHide hide={autoHide.actions} style={{height:40,flexDirection:"row",padding:4,justifyContent:"flex-end",position:"absolute",top:0,width:"100%"}}>
                    <PressableIcon style={{marginRight:10}}name={`mic${!policy.record?"-off":""}`} 
                        color={policy.record && status.whitespacing ? color.warn : undefined}
                        onPress={e=>changePolicy("record",!policy.record)}
                        />
                    <PressableIcon style={{marginRight:10}}name={`visibility${!policy.visible?"-off":""}`} onPress={e=>changePolicy("visible",!policy.visible)}/>

                    <SliderIcon style={{marginRight:10}} 
                        icon={`closed-caption${!policy.caption ? "-disabled":""}`}
                        onToggle={()=>changePolicy("caption",!policy.caption)}
                        onSlideFinish={delay=>changePolicy("captionDelay",delay)}
                        slider={{minimumValue:0,maximumValue:3,step:1,value:policy.captionDelay,text:t=>`${-t}s`}}/>
                    
                    <SliderIcon style={{marginRight:10}}
                        icon={status.volume>0 ? "volume-up" : "volume-off"}
                        onToggle={()=>dispatch({type:"volume/toggle"})}
                        onSlide={volume=>dispatch({type:"volume/tune",volume})}
                        slider={{minimumValue:0,maximumValue:1.0,step:0.01,value:status.volume,text:t=>`${Math.round(t*100)}`}}/>
                    
                    <SliderIcon style={{marginRight:10}} icon="speed" 
                        onToggle={()=>dispatch({type:"speed/toggle"})}
                        onSlideFinish={rate=>dispatch({type:"speed/tune",rate})}
                        slider={{minimumValue:0.5,maximumValue:1.5,step:0.25,value:status.rate,text:t=>`${t}x`}}/>

                    <SliderIcon style={{marginRight:10}} 
                        icon={policy.whitespace>0 ? "notifications" : "notifications-off"}
                        onToggle={()=>changePolicy("whitespace",policy.whitespace>0 ? 0 : 1)}
                        onSlideFinish={value=>changePolicy("whitespace",value)}
                        slider={{minimumValue:0.5,maximumValue:4,step:0.5,value:policy.whitespace,text:t=>`${t}x`}}/>

                    <SliderIcon style={{marginRight:10}}
                        icon={`flash-${policy.chunk>0 ? "on" : "off"}`}
                        onToggle={()=>changePolicy("chunk",policy.chunk>0 ? 0 : 1)}
                        onSlideFinish={get=>(dx,dy)=>changePolicy("chunk",get(dy))}
                        slider={{minimumValue:0,maximumValue:10,step:1,value:policy.chunk,text:t=>({'9':"paragraph","10":"whole"})[t+'']||`${t}s`}}/>

                    <PressableIcon style={{marginRight:10}} name="zoom-out-map" onPress={e=>dispatch({type:'video/fullscreen'})}/>
                </AutoHide>

                {subtitle && status.i>=0 && <Subtitle style={[{width:"100%",height:40, textAlign:"center",position:"absolute",bottom:20},subtitleStyle]}
                    i={status.i} title={chunks[status.i]?.text}
                    delay={policy.captionDelay} show={policy.caption}>
                    {status.whitespacing && <Recognizer key={status.i} 
                        style={{width:"100%",height:20, textAlign:"center",position:"absolute",bottom:0}}
                        onRecord={props=>dispatch({type:"record",...props})} 
                        uri={onRecordChunkUri?.(chunks[status.i])}
                        />}
                </Subtitle>}

                {progress && <AutoHide hide={autoHide.progress} style={[{position:"absolute",bottom:0, width:"100%"},progressStyle]}>
                    <ProgressBar {...{
                        callback:refProgress,
                        value: status.positionMillis,
                        duration:status.durationMillis,
                        asText: (m=0,b=m/1000,a=v=>String(Math.floor(v)).padStart(2,'0'))=>`${a(b/60)}:${a(b%60)}`,
                        onValueChange:time=>dispatch({type:"video", time}),
                        onSlidingStart:e=>setAutoHide(Date.now()+2*60*1000),
                        onSlidingComplete:e=>setAutoHide(Date.now())
                    }}/> 
                </AutoHide>}
            </View>
        </SliderIcon.Container>
        <Context.Provider value={{talk, status, chunks, dispatch}}>
            {children}
        </Context.Provider>
        </>
    )
}

export function Subtitle({show,i,delay,title, children,talk, ...props}){
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

export function Recognizer({uri, onRecord, locale="en_US", style, ...props}){
    const [recognized, setRecognizedText]=React.useState("")
    const scheme=React.useContext(ColorScheme)
    React.useEffect(()=>{
        let recognized4Cleanup
        Voice.onSpeechResults=e=>{
            setRecognizedText(recognized4Cleanup=e?.value.join(""))
        }
        Voice.onSpeechEnd=Voice.onSpeechStart=Voice.onSpeechVolumeChanged=e=>{};
        Voice.onSpeechError=e=>{
            console.error(JSON.stringify(e))
        }
        const audioUri=uri.replace("file://","")+".wav"
        ;(async()=>{
            await FileSystem.makeDirectoryAsync(uri.substring(0,uri.lastIndexOf("/")+1),{intermediates:true})
            Voice.start(locale,{audioUri})  
        })();
        return ()=>{
            Voice.destroy()
            if(recognized4Cleanup){
                onRecord?.({recognized:recognized4Cleanup,audioUri})
            }else{
                FileSystem.deleteAsync("file://"+audioUri,{idempotent:true})
            }
        }
    },[])

    return (
        <Text style={{color:scheme.primary, ...style}} {...props}>
            {recognized}
        </Text>
    )
}

export function ProgressBar({value:initValue=0, duration=0, asText,style, onValueChange, callback,onSlidingComplete,onSlidingStart, ...props}){
    const [value, setValue]=React.useState(initValue)
    React.useEffect(()=>{
        callback.current=setValue
    },[])
    return (
        <View style={[{flex:1,flexDirection:"row"},style]} {...props}>
            <View style={{justifyContent:"center",width:50}}>
                <Text style={{textAlign:"right",}}>{asText(value)}</Text>
            </View>
            <View style={{justifyContent:"center",flexGrow:1}}>
                <Slider {...{style:{flexGrow:1},thumbTintColor:"transparent",onValueChange,onSlidingComplete,onSlidingStart,value, maximumValue:duration}}/>
            </View>
            <View style={{justifyContent:"center",width:50,}}>
                <Text style={{}}>{asText(duration-value)}</Text>
            </View>
        </View>
    )
}

export function NavBar({dispatch,status={}, navable,style, size=24,...props}){
    const color=React.useContext(ColorScheme)
    const containerStyle={width:"100%",flexDirection:"row",alignItems:"center",alignSelf:"center",justifyContent: "space-around", margin:"auto"}
    return (
        <View style={[containerStyle,style]} {...props}>
            {status.isLoaded && (<>
            <PressableIcon size={size}
                disabled={!navable}
                name={status.whitespacing ? "replay-5":"subdirectory-arrow-left"} 
                onPress={e=>dispatch({type:`nav/${status.whitespacing ? "replay" : "prev"}Slow`})}/>
            <PressableIcon size={size} 
                disabled={!navable}
                name={status.whitespacing ? "replay" : "keyboard-arrow-left"} 
                onPress={e=>dispatch({type:`nav/${status.whitespacing ? "replay" : "prev"}`})}/>

            <PlayButton size={size}  
                whitespacing={status.whitespace} 
                disabled={status.whitespacing}
                color={status.whitespacing ? color.warn : undefined}
                name={status.whitespacing ? "fiber-manual-record" : (status.isPlaying ? "pause" : "play-arrow")} 
                onPress={e=>dispatch({type:"nav/play"})}/>
            
            <PressableIcon size={size} 
                disabled={!navable}
                name="keyboard-arrow-right" onPress={e=>dispatch({type:"nav/next"})}/>
            
            <PressableIcon size={size} 
                disabled={!navable}
                name={status.ic>-1 ? "alarm-on" : "alarm-add"}
                onPress={e=>dispatch({type:"nav/challenge"})} 
                color={status.ic>-1 ? "yellow" : undefined}/>
            </>)}
            {!status?.isLoaded && <ActivityIndicator  size="large"/>}
        </View>
    )
}

export function Subtitles(){
    const {chunks, status, i=status.i, dispatch}=React.useContext(Context)
    const scheme=React.useContext(ColorScheme)
    const subtitleRef=React.useRef()
    React.useEffect(()=>{
        if(i>=0 && subtitleRef.current){
            subtitleRef.current.scrollToIndex({index:i, viewPosition:0.5})
        }
    },[i])
    return (
        <View style={{flex:1,padding:10}}>
            <FlatList data={chunks} extraData={i} ref={subtitleRef} estimatedItemSize={32}
                renderItem={({index,item:{text, time}})=>(
                    <>
                        <Pressable style={{flexDirection:"row",marginBottom:10}} onPress={e=>dispatch({type:"video/time",time})}>
                            <Text style={{flexGrow:1,color: index==i ? scheme.active : scheme.unactive}}>{text.replace("\n"," ")}</Text>
                        </Pressable>
                    </>
                )}
                />
        </View>
    ) 
}

export function Challenges({style,...props}){
    const {policy="general"}=useParams()
    const color=React.useContext(ColorScheme)
    const {talk, status, i=status.i,dispatch}=React.useContext(Context)
    const {challenges=[],records=[]}=useSelector(state=>({
        challenges:state.talks[talk.id]?.[policy]?.challenges, 
        records:state.talks[talk.id]?.[policy]?.records,
    }))
    return (
        <View {...props} style={[{padding:4},style]}>
            <FlatList data={challenges||[]} extraData={status.ic} estimatedItemSize={50}
                renderItem={({index,item:{text, time,end}})=>{
                    const recognized=records[`${time}-${end}`]
                    return (
                        <View style={{backgroundColor:index==status.ic ? "gray" : undefined, borderColor:"gray", borderTopWidth:1,marginTop:10,paddingTop:10}}>
                            <Pressable style={{flexDirection:"row",marginBottom:10}} onPress={e=>dispatch({type:"video/position",time})}>
                                <Text style={{width:20, textAlign:"center"}}>{index+1}</Text>
                                <Text style={{flexGrow:1,paddingLeft:10}}>{text.replace("\n"," ")}</Text>
                            </Pressable>
                            <Pressable style={{marginTop:3, flexDirection:"row"}} onPress={e=>{
                                Audio.Sound.createAsync(
                                    {uri:`${FileSystem.documentDirectory}${talk.id}/${policy}/audios/${time}-${end}.wav`},
                                    {shouldPlay:true},
                                    status=>{
                                        if(status.error || status.didJustFinish){
                                            sound.unloadAsync()
                                        }
                                    }
                                )
                            }}>
                                <MaterialIcons size={20} name={recognized ? "replay" : undefined}/>
                                <Text style={{color:color.primary,lineHeight:20,paddingLeft:10}}>{recognized}</Text>
                            </Pressable>
                        </View>
                    )
                }}
                />
        </View>
    )
}



