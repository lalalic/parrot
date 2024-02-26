import React from 'react';
import { View, Text, Pressable, FlatList , Animated, Easing, Image, DeviceEventEmitter,Modal, useWindowDimensions, Keyboard, KeyboardAvoidingView as RNKeyboardAvoidingView} from "react-native";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocation, useNavigate, useParams} from "react-router-native"
import { Audio} from "expo-av"
import Voice from "@react-native-voice/voice"
import * as FileSystem from "expo-file-system"
import { useSelector } from "react-redux"
import {Mutex} from "async-mutex"

import { ColorScheme, TalkStyle } from 'react-native-use-qili/components/default-style'
import * as Speech from "./speech"
import { selectPolicy, isOnlyAudio, Qili, TalkApi } from "../store"
import AutoShrinkNavBar from "react-native-use-qili/components/AutoShrinkNavBar";
import PressableIcon from "react-native-use-qili/components/PressableIcon";
import FlyMessage from "react-native-use-qili/components/FlyMessage"
const l10n=globalThis.l10n

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
                borderColor:"white",justifyContent:"center",alignItems:"center"
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

export const PolicyChoice=({value:defaultValue, onValueChange, style, label, activeColor, color, labelFade,children, excludes=[], deselectable=true, ...props})=>{
    const Color=React.useContext(ColorScheme)
    const [value, setValue]=React.useState("shadowing")
    React.useEffect(()=>{
        setValue(defaultValue)
    },[defaultValue])
    const change=k=>(setValue(k),onValueChange?.(k));
    return (
        <AutoShrinkNavBar style={style} label={label && "  "} {...props}>
            {"shadowing,dictating,retelling".split(",")
                .filter(a=>excludes.indexOf(a)==-1).map(k=>(
                <PressableIcon key={k} 
                    color={value==k ? activeColor||Color.primary : color}
                    name={PolicyIcons[k]} labelFade={labelFade}
                    label={!!label && k.toUpperCase()}
                    onPress={e=>change(value==k && deselectable ? "general" : k)}/>
            ))}
            {children}
        </AutoShrinkNavBar>
    )
}

export const SliderIcon=(uuid=>{
    const Context = React.createContext({});

    function SliderIcon({ onToggle, onSlide, onSlideFinish, slider, icon,color="gray", ...props }){
        const [id] = React.useState(uuid++);
        const { setSliding, sliding} = React.useContext(Context);

        return (
            <PressableIcon onPress={onToggle} name={icon} color={color}
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


export function AutoHide({hide:indicatorOrCallbackRef, style, children, timeout=2000, duration=6000, ...props}){
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
    const {thumb,duration,title, slug}=item
    const navigate=useNavigate()
    const location=useLocation()
    const source=typeof(thumb)=="string" ? {uri:thumb} : thumb
    return (
		<View style={[TalkStyle.thumb, style]}>
            <View style={{flex:1, opacity}}>
                <Pressable onPress={e=>{
                    if(getLinkUri){
                        navigate(getLinkUri(item))
                    }else{
                        if(globalThis.Widgets[slug]?.defaultProps.isWidget){
                            navigate(`/talk/${slug}/shadowing/${item.id}`)
                        }else{
                            navigate(location.pathname,{replace:true, state:{id:item.id}})
                            navigate(`/talk/${slug}/general/${item.id}`)
                        }
                    }
                }}>
                    <Image resizeMode="cover" style={[TalkStyle.image,{height: text ? 90 : "100%"}, imageStyle]} source={source}/>
                </Pressable>
                {!!text && !!duration && durationStyle!==false && <Text  style={[TalkStyle.duration,{top:0},durationStyle]}>{asText(duration)}</Text>}
                {!!text && !!title && (titleStyle!==false || !source) && <Text  style={[TalkStyle.title,{overflow:"hidden",height:20},titleStyle]}>{l10n[title]}</Text>}
            </View>
            {children && React.cloneElement(children,{talk:item})}
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
    fullscreen:"zoom-out-map",
    autoHide: "transit-enterexit"
}

export function TalkSelector({thumbStyle={height:110,width:140}, durationStyle, titleStyle, imageStyle, selected, children, filter=a=>(a.favorited && a), emptyTitle="", style, ...props}){
    const talks=useSelector(({talks={}})=>{
        return Object.keys(talks).map(id=>{
            return filter(talks[id])
        }).filter(a=>!!a)
    })

    if(talks.length==0){
        return (
            <View style={[{flex:1,alignContent:"center", alignItems:"center", margin:50},style]}>
                <Text style={{color:"gray"}}>{l10n[emptyTitle||"It's empty!"]}</Text>
            </View>
        )
    }

    return (
        <FlatList 
            data={talks} style={style}
            getItemLayout={(data,index)=>({length:thumbStyle.width, offset: thumbStyle.width*index, index})}
            renderItem={props=><TalkThumb {...props} style={thumbStyle} children={children} {...{durationStyle, titleStyle, imageStyle}}/>}
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
    setDefaults(){
        Speech.setDefaults(...arguments)
    },
    stop(){
        Speech.stop()
    },
    speak(){
        return Speech.speak(...arguments)
    }
})

export const PlaySound=Object.assign(({audio, children=null, onEnd, onStart, onError})=>{
    React.useEffect(()=>{
        if(audio){
            (async (startAt)=>{
                onStart?.()
                await PlaySound.play(audio,()=>onEnd?.(Date.now()-startAt), onError)
            })(Date.now());

            return ()=>PlaySound.stop?.()
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
    async play(audio,done, onError){
        await lock.runExclusive(async()=>{
            let sound, check
            try{
                const audioFile=await FileSystem.getInfoAsync(audio)
                if(!audioFile.exists){
                    return  
                }
                
                await new Promise(($resolve, reject)=>{
                    const resolve=e=>{
                        clearInterval(check)
                        $resolve()
                    }

                    this.stop=()=>{
                        resolve()
                        sound?.unloadAsync()
                        done?.()
                    }
                    
                    Audio.Sound.createAsync(
                        {uri:audio},
                        {shouldPlay:true},
                        status=>{//expo-audio bug: this function is not called at expected time 
                            const {error, didJustFinish}=status
                            error && console.error(error)
                            if(error || didJustFinish){
                                resolve()
                            }
                        }
                    ).then(a=>{
                        sound=a.sound
                        //a hack for bug 
                        check=setInterval(async ()=>{
                            const status=await sound.getStatusAsync()
                            if(status.didJustFinish || (status.isLoaded && !status.isPlaying)){
                                resolve()
                            }
                        },300)
                    }).catch(e=>{
                        reject(e)
                    })
                })
            }catch(e){
                FlyMessage.show(e.message)
                onError?.(e)
            }finally{
                sound?.unloadAsync()
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
                setState(state=>({...state,active:y>height-70 ? "audio" : (x<=width/2 ? "cancel" : "text")}))
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
    function Recognizer({id,uri, text="", onRecord, locale, style, autoSubmit, onAutoSubmit,onWave, ...props}){
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
                DeviceEventEmitter.emit("recognized",[recognized,id])
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
                console.warn(`[Recognizer] - ${e.message}`)
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
                        DeviceEventEmitter.emit("recognized.done",[recognized,id, locale])
                        onRecord?.({
                            lang:locale,
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
                {recognized||" "}
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

    Recognizer.Text=({children,id,style, onRecognizeEnd, ...props})=>{
        const [recognized, setRecognized]=React.useState(children)
        React.useEffect(()=>{
            const recognizedListener=DeviceEventEmitter.addListener('recognized',([recognized,recId])=>{
                if(id==recId){
                    setRecognized(recognized)
                }
            })
            const doneListener=DeviceEventEmitter.addListener('recognized.done',([recognized,recId])=>{
                if(id==recId){
                    onRecognizeEnd?.(recognized)
                }
            })
            return ()=>{
                doneListener.remove()
                recognizedListener.remove()
            }
        },[])

        return <Text style={style} {...props}>{recognized}</Text>
    }

    return Recognizer
})();

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
            ${talk.transcript?.map(a => {
    const content = a.cues.map(b => b.text).join("");
    const my = needMy && a.cues.map(b => b.my ?? "").join("");
    const time = ((m = 0, b = m / 1000, a = v => String(Math.floor(v)).padStart(2, '0')) => `${a(b / 60)}:${a(b % 60)}`)(a.cues[0].time);
    return `<p><i>${time}</i> ${content}</p>${my ? `<p>${my}</p>` : ""}`;
}).join("\n")}
        </body>
    </html>

`;

export function KeyboardAvoidingView(props){
    return <RNKeyboardAvoidingView {...props} keyboardVerticalOffset={60}/>
}

export function useTalkQuery({api, slug, id, policyName }) {
    const navigate = useNavigate()
    try{
        const Widget = globalThis.Widgets[slug]
        const [service, querySlug]=(()=>{
            if(slug=="youtube")
                return [TalkApi, slug]

            return [api=="Qili"||!!Widget ? Qili : TalkApi, !!Widget ? "Widget" : slug]
        })();
        
        const { data: remote = {}, ...status } = service.useTalkQuery({slug:querySlug, id });
        const local = useSelector(state => state.talks[id||remote?.id]);
        const policy = useSelector(state => selectPolicy({state, policyName, id}));

        const talk = React.useMemo(() => {
            const video = local?.localVideo || remote?.video;
            return {
                miniPlayer: isOnlyAudio(video),
                ...remote,
                ...(({ id, description, slug, title, thumb, ...data }) => data)(Widget?.defaultProps||{}),
                ...local,
                video,
                hasLocal:!!local,
                hasRemote:!!remote?.id,
            }
        }, [remote, local]);

        const { general, shadowing, dictating, retelling, ...data } = talk;
        return { data, policy, 
            challenging: talk[policyName]?.challenging, 
            parentControled: talk[policyName]?.parentControled, 
            ...status
        };
    }catch(e){
        FlyMessage.error(e.message)
        navigate("/home",{replace:true})
    }
}