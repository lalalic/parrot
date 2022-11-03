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

const Context=React.createContext({})

export default function Player({talk, style, children, policy, challenging,
    onPolicyChange, onCheckChunk, onRecordChunkUri, onRecordChunk, onFinish, autoplay, 
    controls:{nav=true, subtitle=true, progress=true}={},
    videoStyle={flex:1}, layoverStyle, navStyle, subtitleStyle, progressStyle,
    ...props}){

    const setPolicyChange=(key,value)=>onPolicyChange({...policy,[key]:value})

    const {policy:policyName}=useParams()
    const challenges=useSelector(state=>state.talks[talk.id]?.[policyName]?.challenges)

    const [chunks, setChunks]=React.useState([])
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

    const [status, setStatus] = React.useState({isLoaded:false, i:-1});
    const [showAutoHide, setShowAutoHide]=React.useState(true)

    const video=React.useRef()

    const terminateWhitespace=async (next)=>{
        if(typeof(status.whitespacing)=="number")
            clearTimeout(status.whitespacing)
        return await video.current?.setStatusAsync({shouldPlay:true,...next})
    }

    const refProgress=React.useRef()
    const navEvents={
        onReplaySlow:e=>{
            terminateWhitespace({positionMillis:chunks[status.i].time,rate:Math.max(0.25,status.rate-0.25)})
        },
        onReplay:e=>{
            terminateWhitespace({positionMillis:chunks[status.i].time})
        },
        onPrevSlow:e=>{
            terminateWhitespace(status.i>1 ? {positionMillis:chunks[status.i-1].time,rate:Math.max(0.25,status.rate-0.25)} : undefined)
        },
        onPrev:e=>{
            terminateWhitespace(status.i>1 ? {positionMillis:chunks[status.i-1].time} : undefined)
        },
        onPlay:e=>{
            terminateWhitespace({shouldPlay:!status.isPlaying})
        },
        onNext:e=>{
            terminateWhitespace(status.i<chunks.length-1 ? {positionMillis:chunks[status.i+1].time} : undefined)
        },
        onCheck:e=>{
            status.i!=-1 && onCheckChunk?.(chunks[status.i])
        },
    }
    return (
        <>
        <SliderIcon.Container 
            style={{width:"100%",...style}} 
            onSliding={e=>setShowAutoHide(Date.now())}
            onStartShouldSetResponder={e=>setShowAutoHide(Date.now())}    
            {...props}>
            <Video 
                ref={video}
                style={videoStyle} 
                posterSource={{uri:talk.thumb}}
                source={{uri:talk.resources?.hls.stream}}
                useNativeControls={false}
                shouldPlay={autoplay}
                shouldCorrectPitch={true}
                progressUpdateIntervalMillis={100}
                onPlaybackStatusUpdate={(current) =>{
                    refProgress.current?.(current.positionMillis)
                    setStatus(last => {
                        const status=(()=>{
                            const {
                                isLoaded,positionMillis,isPlaying,rate,volume,durationMillis,
                                i=chunks.findIndex(a=>a.end>=positionMillis),
                            }=current
                            const ic=challenging ? i : challenges?.findIndex(a=>a.time==chunks[i]?.time)
                            const status={isLoaded,isPlaying,rate,volume,durationMillis,i,ic}
                                
                            if(policy.whitespace && i-last.i==1 && last.i!=-1){
                                if(!last.whitespacing){
                                    const whitespace=policy.whitespace*(chunks[last.i].end-chunks[last.i].time)
                                    const whitespacing=setTimeout(()=>{
                                            setStatus(status)
                                            terminateWhitespace(challenging ? {positionMillis:chunks[status.i].start} : undefined)
                                    },whitespace)
                                    video.current.setStatusAsync({shouldPlay:false, positionMillis:positionMillis})
                                    return {...last, whitespace, whitespacing, isPlaying:false}
                                }
                                return last
                            }

                            if(current.didJustFinish){
                                onFinish?.()
                            }

                            return status
                        })();
                        return shallowEqual(status, last) ? last : status
                    })
                }}
                rate={policy.rate}
                volume={policy.volume}
                />
            <View style={[{position:"absolute",width:"100%",height:"100%",backgroundColor:policy.visible?"transparent":"black"},layoverStyle]}>
                {nav && <NavBar {...{
                        ...navEvents,
                        navable:chunks?.length>=2,
                        status,
                        size:32, style:[{flexGrow:1,opacity:0.5, backgroundColor:"black",marginTop:40,marginBottom:40},navStyle] }}/>}
                
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

                {subtitle && status.i>=0 && <Subtitle style={[{width:"100%",height:40, textAlign:"center",position:"absolute",bottom:20},subtitleStyle]}
                    i={status.i} title={chunks[status.i]?.text}
                    delay={policy.captionDelay} show={policy.caption}>
                    {status.whitespacing && <Recognizer key={status.i} 
                        style={{width:"100%",height:20, textAlign:"center",position:"absolute",bottom:0}}
                        onRecord={props=>policy.record && onRecordChunk?.({chunk:chunks[status.i],i:status.i,...props})} 
                        uri={onRecordChunkUri?.(chunks[status.i])}
                        />}
                </Subtitle>}

                {progress && <AutoHide show={showAutoHide} style={[{position:"absolute",bottom:0, width:"100%"},progressStyle]}>
                    <ProgressBar {...{
                        callback:refProgress,
                        value: status.positionMillis,
                        duration:status.durationMillis,
                        asText: (m=0,b=m/1000,a=v=>String(Math.floor(v)).padStart(2,'0'))=>`${a(b/60)}:${a(b%60)}`,
                        onValueChange:value=>{
                            video.current.setStatusAsync({positionMillis:value})
                            setShowAutoHide(Date.now())
                        }
                    }}/> 
                </AutoHide>}
            </View>
        </SliderIcon.Container>
        <Context.Provider value={{video, talk, status, chunks}}>
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
        <Text style={{color:"yellow", ...style}} {...props}>
            {recognized}
        </Text>
    )
}

export function ProgressBar({value:initValue=0, duration=0, asText,style, onValueChange, callback, ...props}){
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
                <Slider {...{style:{flexGrow:1},thumbTintColor:"transparent",onValueChange,value, maximumValue:duration}}/>
            </View>
            <View style={{justifyContent:"center",width:50,}}>
                <Text style={{}}>{asText(duration-value)}</Text>
            </View>
        </View>
    )
}

export function NavBar({onPrevSlow,onReplaySlow, onPrev, onReplay, onPlay, onNext, onCheck,id, status={}, navable,style, size=24,...props}){
    if(!status?.isLoaded){
        return (
            <View style={[{flexDirection:"row",alignItems:"center",alignSelf:"center", margin:"auto"},style]} {...props}>
                <ActivityIndicator  size="large"/>
            </View>
        )
    }
    return (
        <View style={[{width:"100%",flexDirection:"row",alignItems:"center",alignSelf:"center",justifyContent: "space-around", margin:"auto"},style]} {...props}>
            <PressableIcon size={size}
                disabled={!navable}
                name={status.whitespacing ? "replay-5":"subdirectory-arrow-left"} 
                onPress={status.whitespacing ? onReplaySlow : onPrevSlow}/>
            <PressableIcon size={size} 
                disabled={!navable}
                name={status.whitespacing ? "replay" : "keyboard-arrow-left"} 
                onPress={status.whitespacing ? onReplay : onPrev}/>

            <PlayButton size={size}  
                whitespacing={status.whitespace} 
                disabled={status.whitespacing}
                color={status.whitespacing ? "red" : "white"}
                name={status.whitespacing ? "fiber-manual-record" : (status.isPlaying ? "pause" : "play-arrow")} 
                onPress={onPlay}/>
            
            <PressableIcon size={size} 
                disabled={!navable}
                name="keyboard-arrow-right" onPress={onNext}/>
            
            <PressableIcon size={size} 
                disabled={!navable}
                name="add-alarm" onPress={onCheck} color={status.ic>-1 ? "blue" : undefined}/>
        </View>
    )
}

export function Subtitles(){
    const {video, chunks, status, i=status.i}=React.useContext(Context)
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
                        <Pressable style={{flexDirection:"row",marginBottom:10}} onPress={e=>video.current.setStatusAsync({positionMillis:time})}>
                            <Text style={{flexGrow:1,color: index==i ? "blue" : "white"}}>{text.replace("\n"," ")}</Text>
                        </Pressable>
                    </>
                )}
                />
        </View>
    ) 
}

export function Challenges({style, ...props}){
    const { policy="general"}=useParams()
    const {video, talk, status, i=status.i}=React.useContext(Context)
    const {challenges=[],records=[]}=useSelector(state=>({
        challenges:state.talks[talk.id]?.[policy]?.challenges, 
        records:state.talks[talk.id]?.[policy]?.records,
    }))
    return (
        <View {...props} style={[{padding:4},style]}>
            <FlatList data={challenges||[]} extraData={status.ic} estimatedItemSize={50}
                renderItem={({index,item:{text, time,end}})=>{
                    const recognized=records[`${time}-${end}`]
                    console.log(`${index}, ${index==status.ic}`)
                    return (
                        <View style={{backgroundColor:index==status.ic ? "gray" : undefined, borderColor:"gray", borderTopWidth:1,marginTop:10,paddingTop:10}}>
                            <Pressable style={{flexDirection:"row",marginBottom:10}} onPress={e=>{
                                video.current.setStatusAsync({positionMillis:time})
                            }}>
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
                                <MaterialIcons size={20} 
                                    color={playing ? "red" : undefined}
                                    name={recognized ? "replay" : undefined}/>
                                <Text style={{color:"yellow",lineHeight:20,paddingLeft:10}}>{recognized}</Text>
                            </Pressable>
                        </View>
                    )
                }}
                />
        </View>
    )
}



