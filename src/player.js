import React from 'react';
import {View, Text, Animated, Easing, ActivityIndicator} from "react-native"
import { Video, Audio } from 'expo-av';
import Slider from '@react-native-community/slider'
import * as FileSystem from "expo-file-system"

import { PressableIcon, SliderIcon } from './components';


export default function Player({talk, style, onPolicyChange, onRecordDone, onCheckChunk, autoplay, ...props}){
    const [policy, setPolicy]=React.useState({})
    const setPolicyChange=(key,value)=>setPolicy({...policy,[key]:value})

    React.useEffect(()=>{//apply for props.policy
        setPolicy(props.policy)
    },[props.policy])

    React.useEffect(()=>{//save policy settings
        if(onPolicyChange && policy!=props.policy && Object.keys(policy).length!==0){
            onPolicyChange(policy)
        }
    },[policy])

    const [challenges, setChallenges]=React.useState([])
    React.useEffect(()=>{
        setChallenges(props.challenges)
    },[props.challenges])

    const [record, setRecord]=React.useState()
    React.useEffect(()=>{
        setRecord(props.record)
    },[props.record])

    const [status, setStatus] = React.useState({});
    const [navVisible, setNavVisible]=React.useState({})
    
    const recorder=React.useRef()
    const [recording, setRecording]=React.useState(false)
    React.useEffect(()=>{
        if(!policy.record){
            recorder.current?.stopAndUnloadAsync()
                .then(a=>{
                    FileSystem.deleteAsync(recorder.current.getURI())
                    recorder.current=null
                })
            return 
        }
        async function prepareRecording(){
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });
            recorder.current = new Audio.Recording();
            recorder.current.cues=[]
            recorder.current.setOnRecordingStatusUpdate(status=>setRecording(status.isRecording))
            await recorder.current.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
        }

        prepareRecording()

        return ()=>recorder.current?.stopAndUnloadAsync()
    },[policy.record])
    
    const [chunks, setChunks]=React.useState([])
    React.useEffect(()=>{
        if(talk.languages && typeof(policy.chunk)=="number"){
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
    },[talk, policy.chunk])


    const video=React.useRef()

    const whitespaceTimeoutRef=React.useRef()
    const clearWhiteSpace=()=>{
        if(whitespaceTimeoutRef.current){
            clearTimeout(whitespaceTimeoutRef.current)
            whitespaceTimeoutRef.current=null
            recorder.current?.pauseAsync()
            video.current?.setStatusAsync({shouldPlay:true})
        }
        return true
    }

    const challengePlay=React.useRef()

    return (
        <View style={{width:"100%",flex:1,...style}} {...props}>
            <Video 
                ref={video}
                style={{width:"100%",height:"100%",flex:1}} 
                posterSource={{uri:talk.thumb}}
                source={{uri:talk.resources?.hls.stream}}
                useNativeControls={false}
                shouldPlay={autoplay}
                shouldCorrectPitch={true}
                progressUpdateIntervalMillis={100}
                onPlaybackStatusUpdate={status => setStatus(last => {
                    const i=status.i=chunks.findIndex(a=>a.time>=status.positionMillis)-1
                    if(last.i>=0 && i-last.i==1 && policy.whitespace){ 
                        if(status.isPlaying && last.isPlaying){
                            video.current.setStatusAsync({shouldPlay:false})
                                .then(()=>{
                                    recorder.current?.startAsync()
                                        .then(a=>recorder.current?.cues.push([chunks[last.i].time, a.durationMillis]))
                                    whitespaceTimeoutRef.current=setTimeout(()=>{
                                        clearWhiteSpace()
                                        setStatus(status)
                                    },policy.whitespace*(chunks[i].time-chunks[last.i].time))
                                })
                        }
                        return last
                    }

                    if(challengePlay.current+1==i){
                        challengePlay.current=null
                        video.current.setStatusAsync({rate:status.rate+0.25})
                    }

                    if(status.didJustFinish){
                        recorder.current?.stopAndUnloadAsync()
                            .then(()=>{
                                recorder.current=null
                                onRecordDone({uri: recorder.current.getURI(), cues: recorder.current.cues})
                            })
                    }
                    return status
                })}
                rate={policy.rate}
                volume={policy.volume}
                />
            <SliderIcon.Container
                style={{position:"absolute",width:"100%",height:"100%",backgroundColor:policy.visible?"transparent":"black"}}
                onStartShouldSetResponder={e=>{
                    setNavVisible({...navVisible,when:e.timestamp})
                }}>
                <NavBar {...{
                    status, style:{flexGrow:1,opacity:0.5}, size:60,
                    loading: !talk.id || !status.isLoaded,
                    navable:chunks.length>=2, 
                    isChallenge: challenges?.[chunks?.[status.i]?.time]>=0,
                    onPrevSlow:e=>{
                        clearWhiteSpace()
                        if(status.i>-1){
                            setStatus({i:status.i-1,rate:Math.max(0.25,status.rate-0.25)})
                            video.current.setStatusAsync({positionMillis:chunks[status.i-1].time,rate:Math.max(0.25,status.rate-0.25)})
                                .then(a=>challengePlay.current=status.i-1)
                        }
                    },
                    onPrev:e=>clearWhiteSpace() && status.i && video.current.setStatusAsync({positionMillis:chunks[status.i-1].time}),
                    onPlay:e=>video.current.setStatusAsync({shouldPlay:status.isLoaded && !status.isPlaying}),
                    onNext:e=>clearWhiteSpace() && status.i<chunks.length && video.current.setStatusAsync({positionMillis:chunks[status.i+1].time}),
                    onCheck:e=>status.i!=-1 && onCheckChunk?.([chunks[status.i].time,policy.chunk]),
                }}/>
                <View style={{height:40,flexDirection:"row",padding:4,justifyContent:"flex-end",position:"absolute",top:0,width:"100%"}}>
                    <PressableIcon style={{marginRight:10}}name={`mic${!policy.record?"-off":""}`} 
                        color={policy.record && recording ? "red" : "white"}
                        onPress={e=>setPolicyChange("record",!policy.record)}
                        />
                    <PressableIcon style={{marginRight:10}}name={`visibility${!policy.visible?"-off":""}`} onPress={e=>setPolicyChange("visible",!policy.visible)}/>

                    <SliderIcon style={{marginRight:10}} 
                        icon={`closed-caption${!policy.caption ? "-disabled":""}`}
                        onToggle={()=>setPolicyChange("caption",!policy.caption)}
                        onSlideFinish={delay=>setPolicyChange("captionDelay",delay)}
                        slider={{minimumValue:0,maximumValue:3,step:1,value:policy.captionDelay,text:t=>`${-t}s`}}/>
                    
                    <SliderIcon style={{marginRight:10}}
                        icon={status.volume>0 ? "volume-up" : "volume-off"}
                        onToggle={()=>video.current.setStatusAsync({volume:status.volume==0 ? .50 : 0}).then(status=>setPolicyChange("volume",status.volume))}
                        onSlide={volume=>video.current.setStatusAsync({volume}).then(status=>setPolicyChange("volume",status.volume))}
                        slider={{minimumValue:0,maximumValue:1.0,step:0.01,value:status.volume,text:t=>`${Math.round(t*100)}`}}/>
                    
                    <SliderIcon style={{marginRight:10}} icon="speed" 
                        onToggle={()=>video.current.setStatusAsync({rate:status.rate==0.75 ? 1 : 0.75}).then(status=>setPolicyChange("spped",status.rate))}
                        onSlideFinish={rate=>video.current.setStatusAsync({rate}).then(status=>setPolicyChange("speed",status.rate))}
                        slider={{minimumValue:0.5,maximumValue:1.5,step:0.25,value:status.rate,text:t=>`${t}x`}}/>

                    <SliderIcon style={{marginRight:10}} 
                        icon={policy.whitespace>0 ? "notifications" : "notifications-off"}
                        onToggle={()=>setPolicyChange("whitespace",policy.whitespace>0 ? 0 : 1)}
                        onSlideFinish={value=>setPolicyChange("whitespace",value)}
                        slider={{minimumValue:0.5,maximumValue:4,step:0.5,value:policy.whitespace,text:t=>`${t}x`}}/>

                    <SliderIcon style={{marginRight:10}}
                        icon={`flash-${policy.chunk>0 ? "on" : "off"}`}
                        onToggle={()=>setPolicyChange("chunk",policy.chunk>0 ? 0 : 1)}
                        onSlideFinish={get=>(dx,dy)=>setPolicyChange("chunk",get(dy))}
                        slider={{minimumValue:0,maximumValue:10,step:1,value:policy.chunk,
                            text:t=>{
                                console.warn(t)
                                switch(t){
                                    case 9:
                                        return "paragraph"
                                    case 10:
                                        return "whole"
                                    default:
                                        return `${t}s`
                                }
                            }}}/>

                    <PressableIcon style={{marginRight:10}} name="zoom-out-map" onPress={e=>void 0}/>
                </View>
                <View style={{position:"absolute",bottom:0, width:"100%"}}>
                    <Text textAlign style={{width:"100%",height:40, color:"white", textAlign:"center",position:"absolute",bottom:20}}>
                        {policy.caption && (<DelayText delay={policy.captionDelay} i={status.i}>{chunks[status.i]?.text}</DelayText>)}
                    </Text>
                    <ProgressBar {...{
                        show:navVisible, hide:()=>setNavVisible(false),
                        value: status.positionMillis,
                        duration:status.durationMillis,
                        asText: (m=0,b=m/1000,a=v=>String(Math.floor(v)).padStart(2,'0'))=>`${a(b/60)}:${a(b%60)}`,
                        onValueChange:value=>video.current.setStatusAsync({positionMillis:value})
                    }}/>    
                </View>
            </SliderIcon.Container>
        </View>
    )
}

const DelayText=({children:text,delay, i})=>{
    const [show, setShow]=React.useState("")
    React.useEffect(()=>{
        if(delay){
            setTimeout(()=>setShow(text),delay*1000)
        }else{
            setShow(text)
        }
    },[i])
    return show
}

const ProgressBar=({value=0, duration=0, asText,style, onValueChange, show, hide, ...props})=>{
    const opacity = new Animated.Value(1);
    React.useEffect(()=>{
        if(!show){
            opacity.setValue(1)
            Animated.timing(opacity, {
                toValue: 0,
                duration: 1200,
                easing: Easing.linear,
                useNativeDriver:true,
            }).start();
        }else{
            show.last && clearTimeout(show.last)
            const id=show.last=setTimeout(hide,2000)
            return ()=>clearTimeout(id)
        }
    },[show])
    return (
        <Animated.View style={[{flexDirection:"row"},style, {opacity}]} {...props}>
            <View style={{justifyContent:"center",width:50}}>
                <Text style={{textAlign:"right",color:"white"}}>{asText(value)}</Text>
            </View>
            <View style={{justifyContent:"center",flexGrow:1}}>
                <Slider {...{style:{flexGrow:1},thumbTintColor:"transparent",onValueChange,value, maximumValue:duration}}/>
            </View>
            <View style={{justifyContent:"center",width:50,}}>
                <Text style={{color:"white"}}>{asText(duration-value)}</Text>
            </View>
        </Animated.View>
    )
}

const NavBar=({onPrevSlow, onPrev, onPlay, onNext, onCheck, status, loading,navable, style, size=48, isChallenge, ...props})=>{
    if(loading)
        return (
            <View style={[{flexDirection:"row",alignItems:"center",alignSelf:"center", margin:"auto"},style]} {...props}>
                <ActivityIndicator color="white" size="large"/>
            </View>
        )
    return (
        <View style={[{flexDirection:"row",alignItems:"center",alignSelf:"center", margin:"auto"},style]} {...props}>
            {navable && <PressableIcon size={size} name="subdirectory-arrow-left" onPress={onPrevSlow}/>}
            {navable && <PressableIcon size={size} name="keyboard-arrow-left" onPress={onPrev}/>}
            <PressableIcon size={size} name={!status.isPlaying ? "play-arrow" : "pause"} onPress={onPlay}/>
            {navable && <PressableIcon size={size} name="keyboard-arrow-right" onPress={onNext}/>}
            {navable &&  <PressableIcon size={size} name="check" onPress={onCheck} color={isChallenge ? "blue" : "white"}/>}
        </View>
    )
}
