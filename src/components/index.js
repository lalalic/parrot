import React, { useEffect } from 'react';
import { View, Text, Pressable, FlatList , Animated, Easing, Image, DeviceEventEmitter,Modal, useWindowDimensions} from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import { useLocation, useNavigate, useParams} from "react-router-native"
import { Audio} from "expo-av"
import Voice from "@react-native-voice/voice"
import * as FileSystem from "expo-file-system"
import { useSelector } from "react-redux"
import {Mutex} from "async-mutex"

import { ColorScheme, TalkStyle } from './default-style'
import * as Speech from "./speech"

const AutoHideDuration=6000
export const PressableIcon = ({onPress, onLongPress, onPressIn, onPressOut, children, label, labelFade, labelStyle, style, ...props }) => {
    if(labelFade===true)
        labelFade=AutoHideDuration
    const opacity = React.useRef(new Animated.Value(1)).current;
    React.useEffect(()=>{
        if(labelFade){
            const timing=Animated.timing(opacity, {
                toValue: 0,
                duration:3000,
                easing: Easing.linear,
                useNativeDriver:true,
            })
            timing.start()
            return ()=>timing.stop()
        }
    },[labelFade])
    return (
        <Pressable {...{onPress,onLongPress,onPressIn, onPressOut,style:{justifyContent:"center", alignItems:"center",...style}}}>
            <MaterialIcons {...props}/>
            {children || (label && <Animated.Text style={[labelStyle,{opacity}]}>{label}</Animated.Text>)}
        </Pressable>
    )
}

export const PlayButton = ({size=24, style, color, showPolicy=false, onPress, name, ...props}) => {
    const navigate= useNavigate()
    const scheme=React.useContext(ColorScheme)
    const {slug, policy="general"}=useParams()
    const [showPolicyList, setShowPolicyList] = React.useState(false);
    
    const squareSize=size

    return (
        <View {...props}>
            <View style={{
                width:squareSize,height:squareSize,borderRadius:squareSize/2,borderWidth:1,
                borderColor:scheme.inactive,justifyContent:"center",alignItems:"center"
                }}>
                {showPolicy && !!policy && policy!="general" && (
                    <View style={{position:"absolute",width:"100%", height:"100%",justifyContent:"center",alignItems:"center"}}>
                        <MaterialIcons size={size/1.5} name={PolicyIcons[policy]}/>
                    </View>
                )}
                <PressableIcon size={size} name={name} color={color}
                    style={{opacity: !!policy && policy!="general" ? 0.4 : 1}}
                    onPress={e=>{
                        if(showPolicyList) {
                            setShowPolicyList(false)
                        } else if(onPress){
                            onPress(e)
                        }else{
                            setShowPolicyList(!showPolicyList)
                        }
                    }}
                    onLongPress={e =>setShowPolicyList(!showPolicyList)} 
                    />
                
            </View>

            {showPolicyList && <FlatList style={{position:"absolute",bottom:40,left:-20, width:200, padding:10,backgroundColor:scheme.backgroundColor}}
                data={["general","retelling","dictating", "shadowing"]}
                renderItem={({index,item})=>(
                    <Pressable style={{flexDirection:"row", height:40}} 
                        onPress={e=>{
                            setShowPolicyList(false)
                            navigate(`/talk/${slug}/${item}`,{replace:true})
                        }}>
                        <MaterialIcons name={PolicyIcons[item]}  size={32} color={policy==item ? scheme.primary : undefined}/>
                        <Text style={{marginLeft:10,lineHeight:32}}>{(index==0 ? "Test" : item).toUpperCase()}</Text>
                    </Pressable>
                    )}
                />}
        </View>
    );
};

export const PolicyIcons={
    general:"home-work",
    shadowing:"connect-without-contact",
    dictating:"contact-phone",
    retelling:"contact-mail",
}

export const PolicyChoice=({value:defaultValue, onValueChange, style, label, labelFade,children, excludes=[]})=>{
    const color=React.useContext(ColorScheme)
    const [value, setValue]=React.useState("shadowing")
    React.useEffect(()=>{
        setValue(defaultValue)
    },[defaultValue])
    const change=k=>(setValue(k),onValueChange?.(k));
    return (
        <AutoShrinkNavBar style={style} label={label && "  "}>
            {"shadowing,dictating,retelling".split(",")
                .filter(a=>excludes.indexOf(a)==-1).map(k=>(
                <PressableIcon key={k} 
                    color={value==k ? color.primary : undefined}
                    name={PolicyIcons[k]} labelFade={labelFade}
                    label={!!label && k.toUpperCase()}
                    onPress={e=>change(value==k ? "general" : k)}/>
            ))}
            {children}
        </AutoShrinkNavBar>
    )
}

export function AutoShrinkNavBar({children, label, style, size=4}){
    children=React.Children.toArray(children).flat().filter(a=>!!a)
    const popup=(()=>{
        if(children.length<=size){
            return null
        }
        return (
            <PopMenu {...{label}}>
                {children.splice(size-1)}
            </PopMenu>
        )
    })();
    return (
        <View style={[{flexDirection:"row",justifyContent:"space-around"},style]}>
            {children}
            {popup}
        </View>
    )
}

export const SliderIcon=(uuid=>{
    const Context = React.createContext({});

    function SliderIcon({ onToggle, onSlide, onSlideFinish, slider, icon, ...props }){
        const [id] = React.useState(uuid++);
        const { setSliding, sliding} = React.useContext(Context);

        return (
            <PressableIcon onPress={onToggle} name={icon}
                onLongPress={e => setSliding({ id, onSlide, onSlideFinish, props: slider })}
                onPressOut={e => sliding?.id == id && !sliding.started && setSliding()}
                {...props} />
        );
    }
    
    const Slider = ({
        style: { width = 20, height = 150, left = 0, top = 40, ...style } = {}, 
        minimumTrackTintColor = "blue", maximumTrackTintColor = "gray", 
        minimumValue = 0, maximumValue = 100, step = 1, 
        text = t => t, onValueChange, 
        ...props
    }) => {
        const [value, setValue] = React.useState(props.value || 0);
        React.useEffect(() => {
            onValueChange.current = setValue;
        }, []);
        return (
            <View style={{ height, position: "absolute", left: 10, top, flexDirection: "row"}}>
                <View style={[{ width, height, backgroundColor: maximumTrackTintColor, borderRadius: 10, overflow: "hidden" }, style]}
                    {...props}>
                    <View style={{
                        width: "100%", backgroundColor: minimumTrackTintColor, position: "absolute",
                        height: (value - minimumValue) * height / (maximumValue - minimumValue)
                    }}>
                    </View>
                </View>
                <View style={{justifyContent:"center"}}>
                    <Text style={{backgroundColor:"black"}}>
                        {text(Number(value.toFixed(String(step).split(".")[1]?.length || 0)))}
                    </Text>
                </View>
            </View>
        );
    }

    SliderIcon.Container = ({ children, ...props }) => {
        const [sliding, setSliding] = React.useState(null);
        const onSlideRef = React.useRef(null);

        React.useEffect(() => {
            if (sliding) {
                const { style: { height = 150 } = {}, value = 0, minimumValue = 0, maximumValue = 100, step = 1 } = sliding.props;
                sliding.get = (dy = 0) => {
                    const v = Math.round((value + (maximumValue - minimumValue) / height * dy) / step) * step;
                    const n = Number(v.toFixed(String(step).split(".")[1]?.length || 0));
                    if (n < minimumValue)
                        return minimumValue;
                    if (n > maximumValue)
                        return maximumValue;
                    return n;
                };
            }
        }, [sliding]);

        return (
            <View
                onMoveShouldSetResponder={e => {
                    if (sliding) {
                        sliding.x0 = e.nativeEvent.pageX;
                        sliding.y0 = e.nativeEvent.pageY;
                        sliding.started = true;
                        return true;
                    }
                }}

                onResponderMove={e => {
                    if (sliding) {
                        const value = sliding.get(e.nativeEvent.pageY - sliding.y0);
                        onSlideRef.current?.(value);
                        sliding.onSlide?.(value);
                    }
                }}

                onResponderRelease={e => {
                    if (sliding) {
                        sliding.onSlideFinish?.(sliding.get(e.nativeEvent.pageY - sliding.y0));
                        setSliding(null);
                    }
                }}
                {...props}
            >
                <Context.Provider value={{sliding, setSliding}}>
                    {children}
                </Context.Provider>
                {sliding && <Slider {...sliding.props} onValueChange={onSlideRef} />}
            </View>
        );
    }

    SliderIcon.Context=Context
    return SliderIcon
})(Date.now());


export function AutoHide({hide:indicatorOrCallbackRef, style, children, timeout=2000, duration=AutoHideDuration, ...props}){
    const {sliding}=React.useContext(SliderIcon.Context)
    const opacity = React.useRef(new Animated.Value(1)).current;
    const opacityTimeout=React.useRef()

    const [hide, setHide]=React.useState(false)
    
    React.useEffect(()=>{
        if(typeof(indicatorOrCallbackRef)=="object"){
            indicatorOrCallbackRef.current=setHide
        }else{
            setHide(indicatorOrCallbackRef)
        }
    },[indicatorOrCallbackRef])

    React.useEffect(()=>{
        if(opacityTimeout.current){
            clearTimeout(opacityTimeout.current)
            opacityTimeout.current=null
        }
        opacity.setValue(1)
        if(sliding || hide===false){
            return
        }
        let timing=null
        const timeout=opacityTimeout.current=setTimeout(()=>{
            opacityTimeout.current=null
            opacity.setValue(1);
            (timing=Animated.timing(opacity, {
                toValue: 0,
                duration,
                easing: Easing.linear,
                useNativeDriver:true,
            })).start();
        }, hide-Date.now()+2000)
        return ()=>{
            clearTimeout(timeout)
            timing && timing.stop()
        }
    },[hide,!!sliding])

    return (
        <Animated.View style={[style,{opacity}]} {...props}>
            {children}
        </Animated.View>
    )
}

export function TalkThumb({item, children, style, imageStyle, durationStyle, titleStyle, text=true, opacity=0.6, getLinkUri}){
    const asText=(b,a=v=>String(Math.floor(v)).padStart(2,'0'))=>`${a(b/60)}:${a(b%60)}`
    const {thumb,duration,title, slug, isMedia}=item
    const navigate=useNavigate()
    const location=useLocation()
    return (
		<View style={[TalkStyle.thumb, style]}>
            <View style={{flex:1, opacity}}>
                <Pressable onPress={e=>{
                    if(isMedia==false){
                        navigate(`/widget/${slug}`)
                    }else if(!getLinkUri){
                        navigate(location.pathname,{replace:true, state:{id:item.id}})
                        navigate(`/talk/${slug}`)
                    }else{
                        navigate(getLinkUri(item))
                    }
                }}>
                    <Image style={[TalkStyle.image,{height: text ? 90 : "100%"}, imageStyle]} source={typeof(thumb)=="string" ? {uri:thumb} : thumb}/>
                </Pressable>
                {!!text && !!duration && <Text  style={[TalkStyle.duration,{top:0},durationStyle]}>{asText(duration)}</Text>}
                {!!text && !!title && <Text  style={[TalkStyle.title,{overflow:"hidden",height:20},titleStyle]}>{title}</Text>}
            </View>
            {children && React.cloneElement(children,{talk:item})}
		</View>
	)
}


export function Swipeable({children, rightContent, style, ...props}){
    const [state, setState]=React.useState({swiping:0,x0:0, x1:0,width:0})
    const left=(()=>{
        switch(state.swiping){
            case 0:
                return 0
            case 1:
                return state.x1-state.x0
            case 2:
                return -state.width
        }
    })();
    return (
        <View style={{flex:1}} 
            onMoveShouldSetResponder={({nativeEvent:{pageX:x0}})=>{
                if(state.swiping){
                    return true
                }
            }}
            onResponderRelease={e=>{
                setState({...state, swiping:2,x0:0, x1:0})
            }}
            onResponderMove={({nativeEvent:{pageX:x1}}) => {
                setState({...state, x1, x0:state.x0||x1})
            }}
            >
            <Pressable style={{height:"100%", width:"100%"}} 
                onPressIn={e=>{
                    if(state.swiping==2){
                        setState({...state, swiping:0})
                        return 
                    }
                    setState({...state, swiping:1})
                }}
                {...props}>
                    <View 
                        onLayout={e=>{
                            setState({...state, width: e.nativeEvent.layout.width})
                        }} 
                        style={{position:"absolute", height:"100%", right:0}}>
                        {rightContent}
                    </View>
                    <View style={[{ 
                        position:"absolute",height:"100%", width:"100%", 
                        justifyContent:"center", left
                    },style]}>
                        {children}
                    </View>
            </Pressable>
        </View>
    )
}

export const ControlIcons={
    record:"mic",
    visible:"visibility",
    caption:"closed-caption",
    captionDelay:"closed-caption",
    volume:"volume-up",
    speed:"speed", 
    whitespace:"notifications", 
    chunk:"flash-on", 
    autoChallenge: "alarm",
}

export function TalkSelector({thumbStyle={height:110,width:140}, selected, children, filter=a=>(a.favorited && a), ...props}){
    const talks=useSelector(({talks={}})=>{
        return Object.keys(talks).map(id=>{
            return filter(talks[id])
        }).filter(a=>!!a)
    })

    return (
        <FlatList 
            data={talks}
            getItemLayout={(data,index)=>({length:thumbStyle.width, offset: thumbStyle.width*index, index})}
            renderItem={props=><TalkThumb {...props} style={thumbStyle} children={children}/>}
            keyExtractor={item=>item?.id}
            horizontal={true}
            initialScrollIndex={talks.indexOf(a=>a.id==selected)}
            extraData={selected}
            {...props}
            />
    )
}

// Speak, PlaySound, Recognizer, and Video share mutex lock
const lock=new (class extends Mutex{
    runExclusive(){
        this.cancel()
        return super.runExclusive(...arguments)
    }
})();
export const Speak=Object.assign(({text,children=null, locale, onStart, onEnd})=>{
    const {mylang, tts={}}=useSelector(state=>state.my)
    React.useEffect(()=>{
        (async(startAt)=>{
            console.debug("begin to speak "+text)
            await lock.runExclusive(async ()=>{
                try{
                    onStart?.()
                    await Speech.speak(text, locale&&tts[mylang] ? {iosVoiceId:tts[mylang]} : {})
                }catch(e){
                    console.error(e)
                }finally{
                    onEnd?.(Date.now()-startAt)
                }
            })
        })(Date.now());
        return ()=>Speech.stop()
    },[])
    return children
},{
    async prepare(options){
        const releaseLock = await lock.acquire()
        return [
            async(text)=>await Speech.speak(text,options),
            done=>{
                try{
                    Speech.stop()
                    done?.()
                }finally{
                    releaseLock?.()
                }
            }
        ]
    },
    session(voice){
        const options=voice ? {iosVoiceId:voice} : undefined
        const speak=async text=>{
            if(speak.cancelled)
                return 
            if(!speak.run){
                const [run, stop]=await Speak.prepare(options)
                speak.current=0
                speak.queue=[]
                speak.run=run
                speak.stop=(finalText, done=()=>null)=>{
                    if(speak.canncelled)
                        return done()
                    speak.done=done
                    speak(finalText)
                }
                speak.doStop=stop
                speak.cancel=()=>{
                    speak.cancelled=true
                    speak.queue=Object.freeze([])
                    speak.doStop()
                }
            }
            if(/[\.\!\?]$/g.test(text)){
                speak.queue=text.replace(/\s+/g," ").split(/[\.\!\?]/g).filter(a=>!!a).slice(speak.current)
            }
            if(!speak.running){
                speak.running=true
                const next=()=>(speak.current++, speak.queue.shift())
                while(speak.queue.length){
                    await speak.run(next())
                }
                if(speak.done){
                    speak.doStop()
                    speak.done()
                }
                speak.running=false
            }
        }
        return speak
    },
    setDefaults(){
        Speech.setDefaults(...arguments)
    }
})

export const PlaySound=Object.assign(({audio, children=null, onEnd, onStart})=>{
    React.useEffect(()=>{
        if(audio){
            (async (startAt)=>{
                onStart?.()
                await PlaySound.play(audio,()=>onEnd?.(Date.now()-startAt))
            })(Date.now());
        }
    },[audio])
    return children
},{
    Trigger({name="mic", audio}){
        const color=React.useContext(ColorScheme)
        const [playing, setPlaying]=React.useState(false)
        return (
            <>
                <PressableIcon name={name} 
                    onPress={e=>setPlaying(true)} 
                    color={playing ? color.primary : undefined}/>
                {playing && <PlaySound audio={audio} onEnd={setPlaying}/>}
            </>
        )
    },
    displayName: "PlaySound",
    async play(audio,done){
        await lock.runExclusive(async()=>{
            let sound, check
            try{
                await new Promise(async $resolve=>{
                    const resolve=e=>{
                        clearInterval(check)
                        $resolve()
                    }
                    ({sound}=await Audio.Sound.createAsync(
                        {uri:audio},
                        {shouldPlay:true},
                        status=>{//expo-audio bug: this function is not called at expected time 
                            const {error, didJustFinish}=status
                            error && console.error(error)
                            if(error || didJustFinish){
                                resolve()
                            }
                        }
                    ));
                    //a hack for bug 
                    check=setInterval(async ()=>{
                        const status=await sound.getStatusAsync()
                        if(status.didJustFinish || (status.isLoaded && !status.isPlaying)){
                            resolve()
                        }
                    },300)
                })
            }finally{
                await sound?.unloadAsync()
                done?.()
            }
        })
    }
})


export function Recorder({style, 
    name=ControlIcons.record, size=40,color:_color, 
    onRecordUri, onRecord, onText, onCancel, recording=false, 
    _initState={recording, active:"audio"},
    children=<PressableIcon size={size} name={name} color={_color}/>,
    ...props}){
    
    const [state, setState]=React.useState(_initState)
	const {width, height}=useWindowDimensions()

    const onRecognizedRef=React.useRef()
    onRecognizedRef.current=React.useCallback(record=>{
        if(record.recognized){
            switch(state.active){
                case "text":
                    onText?.(record)
                    break
                case "audio":
                    onRecord?.(record)
                    break
                default:
                    onCancel?.(record)
            }
        }
        setState(_initState)
    },[state])

    return (
        <View style={[{alignItems:"center", justifyContent:"center", flexDirection:"column"},style]}
            pointerEvents="box-only"
            onStartShouldSetResponder={e=>{
                setState(state=>({...state, recording:true}))
                return true
            }}
            onMoveShouldSetResponder={e=>true}
            onResponderMove={e=>{
                const {pageX:x, pageY:y}=e.nativeEvent
                setState(state=>({...state,active:y>height-50 ? "audio" : (x<=width/2 ? "cancel" : "text")}))
            }}
            onResponderRelease={e=>setState(state=>({...state, recording:false}))}
            >
            {children}
            <Modal visible={state.recording} transparent={true}>
                <View style={{flex:1, flexDirection:"column", backgroundColor:"rgba(128,128,128,0.8)"}}>
                    <View style={{flex:1}}/>
                    <View style={{height:50, margin:10, alignItems:"center", flexDirection:"column"}}>
                        <Recognizer.Text style={{textAlign:"center",backgroundColor:"green", padding:2, borderRadius:5, width:200, height: state.active=="text" ? 50 : 0}}/>
                        {state.active!=="text" && <Recognizer.Wave barWidth={3} style={{flex:1, borderRadius:5}}/>}
                    </View>
                    <View style={{height:100, flexDirection:"row"}}>
                        
                        <PressableIcon style={{flex:1}} name="cancel"  
                            size={state.active=="cancel" ? 60 : 40} 
                            color={state.active=="cancel" ? "red" : "white"}/>
                        
                        <PressableIcon style={{flex:1}} name="textsms"  
                                size={state.active=="text" ? 60 : 40}
                                color={state.active=="text" ? "red" : "white"}/>
                    </View>
                    <PressableIcon name="multitrack-audio" size={40} 
                        style={{height:100, backgroundColor:state.active=="audio" ? "lightgray" : "transparent"}}/>
                </View>
            </Modal>
            {state.recording && <Recognizer uri={onRecordUri?.()} {...props} style={{position:"absolute"}} onRecord={record=>onRecognizedRef.current?.(record)}/>}
        </View> 
    )
}

export const Recognizer=(()=>{
    function Recognizer({i,uri, text="", onRecord, locale, style, autoSubmit, onAutoSubmit,onWave, ...props}){
        const {lang, mylang}=useSelector(state=>state.my)
        if(locale===true){
            locale=mylang||"zh-CN"
        }else{
            locale=locale||lang||"en-US"
        }

        const autoSubmitHolder=React.useRef(null)
        const [recognized, setRecognizedText]=React.useState(text)
        const scheme=React.useContext(ColorScheme)

        React.useEffect(()=>{
            let recognized, start, releaseLock
            Voice.onSpeechResults=e=>{
                clearTimeout(autoSubmitHolder.current)
                setRecognizedText(recognized=e?.value.join(""))
                DeviceEventEmitter.emit("recognized",[recognized,i])
                autoSubmitHolder.current=setTimeout(()=>{
                    onAutoSubmit?.({
                        recognized, 
                        uri:`file://${audioUri}`, 
                        duration:Date.now()-start
                    })
                },autoSubmit)
            }
            Voice.onSpeechStart=e=>{
                start=Date.now()
            }
            Voice.onSpeechEnd=e=>{
                
            }
            Voice.onSpeechVolumeChanged=e=>{
                DeviceEventEmitter.emit("wave",e.value,locale)
            }

            Voice.onSpeechError=e=>{
                console.error(e)
            }
            const audioUri=uri?.replace("file://","")
            ;(async()=>{
                if(audioUri){
                    const folder=uri.substring(0,uri.lastIndexOf("/")+1)
                    const info=await FileSystem.getInfoAsync(folder)
                    if(!info.exists){
                        await FileSystem.makeDirectoryAsync(folder,{intermediates:true})
                    }
                }
                releaseLock=await lock.acquire()
                Voice.start(locale,{audioUri})  
            })();

            return async ()=>{
                try{
                    await Voice.stop()
                    await Voice.destroy()
                    if(recognized){
                        DeviceEventEmitter.emit("recognized.done",[recognized,i])
                        onRecord?.({
                            recognized, 
                            uri:`file://${audioUri}`, 
                            duration:Date.now()-start
                        })
                    }else{
                        onRecord?.({})
                    }
                }finally{
                    releaseLock?.()
                }
            }
        },[])

        return !DeviceEventEmitter.listenerCount('recognized') && (
            <Text style={{color:scheme.primary, ...style}} {...props}>
                {recognized||"..."}
            </Text>
        )
    }

    Recognizer.Wave=({ style, sampleAmount=10, backgroundColor="green", color="black", barWidth=2, barHeight=a=>parseInt((a*10+10)*4/5)})=>{
        const [data]=React.useState((a=barHeight(0))=>new Array(sampleAmount).fill(a))
        const [changed, setChanged]=React.useState()
        React.useEffect(()=>{
            DeviceEventEmitter.addListener('wave',value=>{
                data.unshift(value)
                data.pop()
                setChanged(Date.now())
            })
        },[])
        return (
            <View style={{width:200, paddingLeft:50, paddingRight:50, ...style,justifyContent:"space-around", backgroundColor, flexDirection:"row", alignItems:"center"}}>
                {data.map(barHeight).map((a,i)=><View key={i} style={{backgroundColor:color, width:barWidth, height:`${a}%`}}/>)}
            </View>
        )
        
    }

    Recognizer.Text=({children,i,style, onRecognizeEnd, ...props})=>{
        const color=React.useContext(ColorScheme)
        const [recognized, setRecognized]=React.useState(children)
        React.useEffect(()=>{
            const recognizedListener=DeviceEventEmitter.addListener('recognized',([recognized,index])=>{
                if(i==index){
                    setRecognized(recognized)
                }
            })
            const doneListener=DeviceEventEmitter.addListener('recognized.done',([recognized,index])=>{
                if(i==index){
                    onRecognizeEnd?.(recognized)
                }
            })
            return ()=>{
                doneListener.remove()
                recognizedListener.remove()
            }
        },[])

        return <Text style={{color:recognized!=children ? color.primary : color.text, ...style}} {...props}>{recognized}</Text>
    }

    return Recognizer
})();

export function PopMenu({style, triggerIconName="more-vert", label, children, height=50}){
    const color=React.useContext(ColorScheme)
    const [listing, setListing]=React.useState(false)
    return (
        <View>
            <PressableIcon name={triggerIconName} label={label} onPress={e=>setListing(!listing)}/>
            {listing && <View pointerEvents="box-none"
                onTouchEnd={e=>setListing(false)}
                style={[
                    {position:"absolute",right:0,bottom:50, backgroundColor:color.backgroundColor,padding:10, width:50},
                    {flexDirection:"column", justifyContent:"space-around", height:height*React.Children.toArray(children).length},
                    style
                ]}>
                {children}
            </View>}
        </View>
    )
}

export const FlyMessage=Object.assign(()=>{
    const [message, setMessage]=React.useState("")
    useEffect(()=>{
        FlyMessage.setMessage=setMessage
        return ()=>FlyMessage.setMessage=()=>null
    },[])
    if(message){
        return (
            <View style={{position:"absolute", bottom:0,width:"100%", color:"yellow", justifyContent:"center", alignItems:"center"}}>
                <Text>{message}</Text>
            </View>
        )
    }
},{
    show(message){
        this.setMessage(message)
        setTimeout(()=>this.setMessage(""),3000)
    }
})

export const html = (talk, lineHeight, margins, needMy) => `
    <html>
        <style>
            p{line-height:${lineHeight}%;margin:0;text-align:justify}
            @page{
                ${Object.keys(margins).map(k => `margin-${k}:${margins[k]}`).join(";")}
            }
        </style>
        <body>
            <h2>
                <span>${talk.title}</span>
                <span style="font-size:12pt;float:right;padding-right:10mm">${talk.speaker} ${new Date().asDateString()}</span>
            </h2>
            ${talk.languages?.mine?.transcript?.map(a => {
    const content = a.cues.map(b => b.text).join("");
    const my = needMy && a.cues.map(b => b.my ?? "").join("");
    const time = ((m = 0, b = m / 1000, a = v => String(Math.floor(v)).padStart(2, '0')) => `${a(b / 60)}:${a(b % 60)}`)(a.cues[0].time);
    return `<p><i>${time}</i> ${content}</p>${my ? `<p>${my}</p>` : ""}`;
}).join("\n")}
        </body>
    </html>

`;

                    