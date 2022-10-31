import React from 'react';
import {View, Text, Animated, Easing, ActivityIndicator, /*FlatList,*/ Pressable} from "react-native"
import { Video, Audio } from 'expo-av';
import Slider from '@react-native-community/slider'
import * as FileSystem from "expo-file-system"
import Voice from "@react-native-voice/voice"

import { PressableIcon, SliderIcon, PlayButton, AutoHide } from './components';
import {FlashList as FlatList} from "@shopify/flash-list"

export default function Player({talk, style, children, 
    onPolicyChange, onRecordDone, onCheckChunk, autoplay, 
    controls:{nav=true, subtitle=true, progress=true}={},
    videoStyle,

    ...props}){
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

    const [status, setStatus] = React.useState({isLoading:true});
    const [showAutoHide, setShowAutoHide]=React.useState(true)
    
    React.useEffect(()=>{
 
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

    const terminateWhitespace=async ()=>{
        if(typeof(status.whitespacing)=="number")
            clearTimeout(status.whitespacing)
        await video.current?.setStatusAsync({shouldPlay:true})
    }

    const challengePlay=React.useRef()

    return (
        <View style={{width:"100%",...style}} {...props}>
            <View style={[{flex:1},videoStyle]}>
                <Video 
                    ref={video}
                    style={[{width:"100%",height:"100%",flex:1}]} 
                    posterSource={{uri:talk.thumb}}
                    source={{uri:talk.resources?.hls.stream}}
                    useNativeControls={false}
                    shouldPlay={autoplay}
                    shouldCorrectPitch={true}
                    progressUpdateIntervalMillis={100}
                    onPlaybackStatusUpdate={(current) => setStatus(last => {
                        const {isLoaded,isLoading=!isLoaded,positionMillis,isPlaying,rate,volume,durationMillis}=current
                        const status={isLoaded,isLoading,positionMillis,isPlaying,rate,volume,durationMillis}
                        const i=status.i=chunks.findIndex(a=>a.end>=status.positionMillis)
                            
                        if(policy.whitespace && i-last.i==1 && last.i!=-1){
                            if(!last.whitespacing){
                                if(last.byNext)
                                    return status
                                ;(async ()=>{
                                    try{
                                        await video.current.setStatusAsync({shouldPlay:false})
                                        const timeoutId=setTimeout(()=>{
                                            terminateWhitespace()
                                            setStatus(status)
                                        },policy.whitespace*(chunks[last.i].end-chunks[last.i].time))
                                        last.whitespacing=timeoutId
                                    }catch(e){
                                        console.error(e)
                                    }
                                })();
                                return {...last, whitespacing:true}
                            }
                            return last
                        }

                        if(challengePlay.current+1==i){
                            challengePlay.current=null
                            video.current.setStatusAsync({rate:status.rate+0.25})
                        }
                        return status
                    })}
                    rate={policy.rate}
                    volume={policy.volume}
                    />
                <SliderIcon.Container
                    style={{position:"absolute",width:"100%",height:"100%",backgroundColor:policy.visible?"transparent":"black"}}
                    onSliding={e=>setShowAutoHide(Date.now())}
                    onStartShouldSetResponder={e=>setShowAutoHide(Date.now())}>
                    {nav && <NavBar {...{chunks,video,terminateWhitespace,status,challengePlay,challenges,onCheckChunk,setStatus,policy, 
                            size:60, style:{flexGrow:1,opacity:0.5}, }}/>}
                    
                    <AutoHide show={showAutoHide} style={{height:40,flexDirection:"row",padding:4,justifyContent:"flex-end",position:"absolute",top:0,width:"100%"}}>
                        <PressableIcon style={{marginRight:10}}name={`mic${!policy.record?"-off":""}`} 
                            color={policy.record && status.whitespacing ? "red" : undefined}
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
                    </AutoHide>
                    
                    {(subtitle || progress) &&<View style={{position:"absolute",bottom:0, width:"100%"}}>
                        {subtitle && <Subtitle style={{width:"100%",height:40, textAlign:"center",position:"absolute",bottom:20}}
                            i={status.i} title={chunks[status.i]?.text}
                            delay={policy.captionDelay} show={policy.caption}>
                            {status.whitespacing && <Recorder key={status.i} uri={`${FileSystem.documentDirectory}${talk.id}/recording/${status.i}.wav`}/>}
                        </Subtitle>}
                        {progress && <AutoHide show={showAutoHide}>
                            <ProgressBar {...{
                                value: status.positionMillis,
                                duration:status.durationMillis,
                                asText: (m=0,b=m/1000,a=v=>String(Math.floor(v)).padStart(2,'0'))=>`${a(b/60)}:${a(b%60)}`,
                                onValueChange:value=>video.current.setStatusAsync({positionMillis:value})
                            }}/> 
                        </AutoHide>}   
                    </View>}
                </SliderIcon.Container>

            </View>
            {children}
        </View>
    )
}

export const Subtitle=({show,i,delay,title, children,talk, ...props})=>{
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
                {children}
            </Text> 
        </>
    )
}

export const ProgressBar=({value=0, duration=0, asText,style, onValueChange, ...props})=>(
    <View style={[{flexDirection:"row"},style]} {...props}>
        <View style={{justifyContent:"center",width:50}}>
            <Text style={{textAlign:"right",}}>{asText(value)}</Text>
        </View>
        <View style={{justifyContent:"center",flexGrow:1}}>
            <Slider {...{style:{flexGrow:1},thumbTintColor:"transparent",onValueChange,value, maximumValue:duration}}/>
        </View>
        <View style={{justifyContent:"center",width:50,}}>
            <Text style={{}}>{asText(duration-value)}</Text>
        </View>
    </View>
)

export const NavBar=({status={}, video, chunks=[], terminateWhitespace,challengePlay, onCheckChunk,challenges=[], setStatus, policy,
    onReplaySlow=e=>{
        terminateWhitespace()
        video.current.setStatusAsync({positionMillis:chunks[status.i].time,rate:Math.max(0.25,status.rate-0.25)})
            .then(a=>challengePlay.current=status.i-1)
    },
    onReplay=e=>{
        terminateWhitespace()
        video.current.setStatusAsync({positionMillis:chunks[status.i].time})
    },
    onPrevSlow=e=>{
        terminateWhitespace()
        if(status.i>1){
            video.current.setStatusAsync({positionMillis:chunks[status.i-1].time,rate:Math.max(0.25,status.rate-0.25)})
                .then(a=>challengePlay.current=status.i-1)
        }
    },
    onPrev=e=>{
        terminateWhitespace()
        if(status.i>1){
            video.current.setStatusAsync({positionMillis:chunks[status.i-1].time})
        }
    },
    onPlay=e=>{
        if(!status.isLoaded)
            return 
        if(typeof(status.whitespacing)=="number"){
            clearTimeout(status.whitespacing)
        }
        
        const shouldPlay=!status.isPlaying
        video.current.setStatusAsync({shouldPlay})
    },
    onNext=e=>{
        terminateWhitespace() 
        if(status.i<chunks.length-1){
            setStatus(last=>({...last, byNext:true}))
            video.current.setStatusAsync({positionMillis:chunks[status.i+1].time})
        }
    },
    onCheck=e=>{
        status.i!=-1 && onCheckChunk?.([chunks[status.i].time,policy.chunk])
    },
    isChallenge=challenges?.[chunks?.[status?.i]?.time]>=0,                    
    navable=chunks?.length>=2, 
    style, size=48,...props})=>{
    if(status?.isLoading){
        return (
            <View style={[{flexDirection:"row",alignItems:"center",alignSelf:"center", margin:"auto"},style]} {...props}>
                <ActivityIndicator  size="large"/>
            </View>
        )
    }
    return (
        <View style={[{flexDirection:"row",alignItems:"center",alignSelf:"center", margin:"auto"},style]} {...props}>
            <PressableIcon size={size} 
                disabled={!navable}
                name={status.whitespacing ? "replay-5":"subdirectory-arrow-left"} 
                onPress={status.whitespacing ? onReplaySlow : onPrevSlow}/>
            <PressableIcon size={size} 
                disabled={!navable}
                name={status.whitespacing ? "replay" : "keyboard-arrow-left"} 
                onPress={status.whitespacing ? onReplay : onPrev}/>
            <PlayButton size={size} name={status.isPlaying||status.whitespacing ? "pause" : "play-arrow"} onPress={onPlay}/>
            <PressableIcon size={size} 
                disabled={!navable}
                name="keyboard-arrow-right" onPress={onNext}/>
            <PressableIcon size={size} 
                disabled={!navable}
                name="check" onPress={onCheck} color={isChallenge ? "blue" : undefined}/>
        </View>
    )
}

export const Recorder=({uri, locale="en_US"})=>{
    const [audioUri, setAudioUri]=React.useState()
    const [recognizedText, setRecognizedText]=React.useState("")
    React.useEffect(()=>{
        Voice.onSpeechStart=e=>{
            setAudioUri(e?.audioUri)
        }

        Voice.onSpeechResults=e=>{
            console.log(e?.value)
            setRecognizedText(e?.value)
        }

        Voice.onSpeechEnd=async e=>{
            if(!!!audioUri)
                return 
            
            const info=await FileSystem.getInfoAsync()
            if(info.exists && info.size>0){
                await FileSystem.moveAsync(audioUri, uri)
            }
        }

        Voice.onSpeechError=e=>{
            console.error(e)
        }
        Voice.onSpeechVolumeChanged=e=>{}

        Voice.start("en_US")

        return ()=>Voice.destroy()
    },[])

    return (
        <>
            {recognizedText}
        </>
    )
}

export const Subtitles=({video, chunks, i})=>{
    const subtitleRef=React.useRef()
    React.useEffect(()=>{
        if(i>=0 && subtitleRef.current){
            subtitleRef.current.scrollToIndex({index:i,viewPosition:0.5})
        }
    },[i])
    return (
        <View style={{flex:1,padding:10}}>
            <FlatList data={chunks} extraData={i} ref={subtitleRef}
                renderItem={({index,item:{text, time}})=>(
                    <>
                        <Pressable style={{flexDirection:"row",marginBottom:10}} onPress={e=>video.current.setStatusAsync({positionMillis:time})}>
                            <Text style={{flexGrow:1,color: index==i ? "blue" : "white"}}>{text.replace("\n"," ")}</Text>
                        </Pressable>
                    </>
                )}
                />
        </View>
    ) 
}


