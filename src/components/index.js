import React from 'react';
import { View, Text, Pressable, FlatList , Animated, Easing, Image, DeviceEventEmitter} from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import { useLocation, useNavigate, useParams} from "react-router-native"
import { Audio } from "expo-av"
import * as FileSystem from "expo-file-system"
import Voice from "@react-native-voice/voice"
import { useSelector } from "react-redux"

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

export const PolicyChoice=({value:defaultValue, onValueChange, style, label, labelFade, excludes=[]})=>{
    const color=React.useContext(ColorScheme)
    const [value, setValue]=React.useState("shadowing")
    React.useEffect(()=>{
        setValue(defaultValue)
    },[defaultValue])
    const change=k=>(setValue(k),onValueChange?.(k));
    return (
        <View style={[{flexDirection:"row",justifyContent:"space-around"},style]}>
            {"shadowing,dictating,retelling".split(",")
                .filter(a=>excludes.indexOf(a)==-1).map(k=>(
                <PressableIcon key={k} 
                    color={value==k ? color.primary : undefined}
                    name={PolicyIcons[k]} labelFade={labelFade}
                    label={!!label && k.toUpperCase()}
                    onPress={e=>change(value==k ? "general" : k)}/>
            ))}
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
    const {thumb,duration,title, slug}=item
    const navigate=useNavigate()
    const location=useLocation()
    return (
		<View style={[TalkStyle.thumb, style]}>
            <View style={{flex:1, opacity}}>
                <Pressable onPress={e=>{
                    if(!getLinkUri){
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


export const Speak=({text,children=null})=>{
    React.useEffect(()=>{
        if(text){
            Speech.speak(text)
            return ()=>Speech.stop()
        }
    },[text])
    return children
}

let gPlaying=false
export const PlaySound=Object.assign(({audio, children=null, onFinish})=>{
    React.useEffect(()=>{
        if(audio){
            let sound,status
            ;(async ()=>{
                try{
                    const info=await FileSystem.getInfoAsync(audio)
                    if(!info.exists){
                        onFinish?.(false)
                        return
                    }
                    ;({sound,status}=await Audio.Sound.createAsync({uri:audio}));
                    await sound.playAsync()
                    setTimeout(()=>{
                        sound?.unloadAsync()
                        onFinish?.(true)
                    },status.durationMillis)
                }catch(e){
                    console.error(e)
                }
            })();

            return ()=>sound?.unloadAsync()
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
                    onPress={e=>{
                        if(gPlaying){
                            gPlaying=true
                            setPlaying(true)
                        }
                    }} 
                    color={playing ? color.primary : undefined}/>
                {playing && <PlaySound audio={audio} 
                    onFinish={e=>{
                        gPlaying=false
                        setPlaying(false)
                    }}/>}
            </>
        )
    }
})


export function Recorder({audio, text,style, textStyle, size=40, onRecord, onRecordUri,color:_color}){
    const color=React.useContext(ColorScheme)
    const [recording, setRecording]=React.useState(false)
    return (
        <>
            <PressableIcon style={style} size={size} name={ControlIcons.record} 
                color={recording ? "red" : (audio ? color.primary : _color)}
                onPressIn={e=>{setRecording(true)}}
                onPressOut={e=>{setRecording(false)}}
                />                       
            {recording && <Recognizer uri={audio||onRecordUri?.()} 
                    text={text} style={textStyle}
                    onRecord={({recognized:text,uri:audio, ...props})=>{
                        onRecord?.({...props, text, audio})
                        setTimeout(()=>setRecording(false),0)
                    }}/>
                }
            {!recording && (<Text style={textStyle}>{text}</Text>)}
        </>
    )
}

export function Recognizer({i, uri, text="", onRecord, locale="en_US", style, ...props}){
    const [recognized, setRecognizedText]=React.useState(text)
    const scheme=React.useContext(ColorScheme)
    React.useEffect(()=>{
        let recognized4Cleanup, start, end
        Voice.onSpeechResults=e=>{
            setRecognizedText(recognized4Cleanup=e?.value.join(""))
            DeviceEventEmitter.emit("recognized",[recognized4Cleanup,i])
        }
        Voice.onSpeechStart=e=>{
            start=Date.now()
        }
        Voice.onSpeechEnd=e=>{
            end=Date.now()
        }
        Voice.onSpeechVolumeChanged=e=>{};
        Voice.onSpeechError=e=>{
            //console.error(`${e.error.code}:${e?.error?.message}`)
        }
        const audioUri=uri.replace("file://","")
        ;(async()=>{
            const folder=uri.substring(0,uri.lastIndexOf("/")+1)
            const info=await FileSystem.getInfoAsync(folder)
            if(!info.exists){
                await FileSystem.makeDirectoryAsync(folder,{intermediates:true})
            }
            Voice.start(locale,{audioUri})  
        })();
        return async ()=>{
            const removeAudioFile=(message) =>{
                try{ FileSystem.deleteAsync("file://"+audioUri,{idempotent:true})}catch{}
            }
            await Voice.stop()
            await Voice.destroy()
            if(recognized4Cleanup){
                DeviceEventEmitter.emit("recognized.done",[recognized4Cleanup,i])
                onRecord?.({
                    recognized:recognized4Cleanup, 
                    uri:`file://${audioUri}`, 
                    duration:(end||Date.now())-start
                })
            }else{
                onRecord?.({})
                removeAudioFile("no recognized")
            }
        }
    },[])

    return !DeviceEventEmitter.listenerCount('recognized') && (
        <Text style={{color:scheme.primary, ...style}} {...props}>
            {recognized}
        </Text>
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

export const ControlIcons={
    record:"mic",
    visible:"visibility",
    caption:"closed-caption",
    captionDelay:"closed-caption",
    volume:"volume-up",
    speed:"speed", 
    whitespace:"notifications", 
    chunk:"flash-on", 
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