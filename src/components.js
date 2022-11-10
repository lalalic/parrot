import React from 'react';
import { View, Text, Pressable, FlatList , Animated, Easing, Image} from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import { Link, useNavigate, useParams} from "react-router-native"
import { ColorScheme, TalkStyle } from './default-style';

const AutoHideDuration=6000
export const PressableIcon = ({onPress, onLongPress, onPressOut, children, label, labelFade, labelStyle,...props }) => {
    if(labelFade===true)
        labelFade=AutoHideDuration
    const opacity = React.useRef(new Animated.Value(1)).current;
    React.useEffect(()=>{
        if(labelFade){
            Animated.timing(opacity, {
                toValue: 0,
                duration:3000,
                easing: Easing.linear,
                useNativeDriver:true,
            }).start();
        }
    },[labelFade])
    return (
        <Pressable {...{onPress,onLongPress, onPressOut,style:{justifyContent:"center", alignItems:"center"}}}>
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
    general:"play-arrow",
    shadowing:"connect-without-contact",
    dictating:"contact-phone",
    retelling:"contact-mail",
}

export const PolicyChoice=({value:defaultValue, onValueChange, style, label, labelFade})=>{
    const color=React.useContext(ColorScheme)
    const [value, setValue]=React.useState("shadowing")
    React.useEffect(()=>{
        setValue(defaultValue)
    },[defaultValue])
    const change=k=>(setValue(k),onValueChange?.(k));
    return (
        <View style={[{flexDirection:"row",justifyContent:"space-around"},style]}>
            {"shadowing,dictating,retelling".split(",").map(k=>(
                <PressableIcon key={k} 
                    color={value==k ? color.primary : undefined}
                    name={PolicyIcons[k]} labelFade={labelFade}
                    label={!!label && k.toUpperCase()}
                    onPress={e=>change(value==k ? null : k)}/>
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


export function AutoHide({hide, style, children, timeout=2000, duration=AutoHideDuration, ...props}){
    const {sliding}=React.useContext(SliderIcon.Context)
    const opacity = React.useRef(new Animated.Value(1)).current;
    const opacityTimeout=React.useRef()
    React.useEffect(()=>{
        if(opacityTimeout.current){
            clearTimeout(opacityTimeout.current)
            opacityTimeout.current=null
        }
        opacity.setValue(1)
        if(sliding || hide===false){
            return
        }
        opacityTimeout.current=setTimeout(()=>{
            opacityTimeout.current=null
            opacity.setValue(1)
            Animated.timing(opacity, {
                toValue: 0,
                duration,
                easing: Easing.linear,
                useNativeDriver:true,
            }).start();
        }, hide-Date.now()+2000)
    },[hide,!!sliding])

    return (
        <Animated.View style={[style,{opacity}]} {...props}>
            {children}
        </Animated.View>
    )
}

export function TalkThumb({item, children, style, imageStyle, durationStyle, titleStyle, text=true, opacity=0.6}){
    const asText=(b,a=v=>String(Math.floor(v)).padStart(2,'0'))=>`${a(b/60)}:${a(b%60)}`
    const {thumb,duration,title, slug}=item
    return (
		<View style={[TalkStyle.thumb, style]}>
            <View style={{flex:1, opacity}}>
                <Link to={`/talk/${slug}`}>
                    <Image style={[TalkStyle.image,{height: text ? 90 : "100%"}, imageStyle]} source={typeof(thumb)=="string" ? {uri:thumb} : thumb}/>
                </Link>
                {!!text && !!duration && <Text  style={[TalkStyle.duration,{top:0},durationStyle]}>{asText(duration)}</Text>}
                {!!text && !!title && <Text  style={[TalkStyle.title,{overflow:"hidden",height:20},titleStyle]}>{title}</Text>}
            </View>
            {children && React.cloneElement(children,{talk:item})}
		</View>
	)
}

export class Media extends React.Component{
    static defaultProps={
        isWidget:true,
        progressUpdateIntervalMillis:500,
        positionMillis:0,
    }
    
    constructor({rate=1,volume,positionMillis=0}){
        super(...arguments)
        this.status={
            isLoaded:true,
            didJustFinish:false,
            durationMillis:0,
            positionMillis,
            rate,
            volume,
            isLoading:false,
            shouldPlay:false,
            isPlaying:false,
        }
        this.state={}
    }

    shouldComponentUpdate(nextProps, state){
        if(this.state!==state){
            return true
        }
        return false 
    }

    onPlaybackStatusUpdate(particular){
        this.props.onPlaybackStatusUpdate?.({
            ...this.status,
            ...particular,
            positionMillis:this.progress.current, 
        })
    }

    componentDidMount(){
        this.status.durationMillis=this.durationMillis
        const {progressUpdateIntervalMillis, positionMillis=0, shouldPlay}=this.props
        this.progress=new Animated.Value(positionMillis)
        this.progress.current=0
        this.progress.last=0

        const eventHandler=({value})=>{
            if(value==0)
                return 
            value=Math.floor(value)
            this.progress.current=value
            if(this.progress.current-this.progress.last>=progressUpdateIntervalMillis){
                this.progress.last=value
                this.onPlaybackStatusUpdate()
            }
        }

        this.progress.addListener(eventHandler)

        this.setStatusAsync({shouldPlay,positionMillis})

        this.onPlaybackStatusUpdate()
    }

    componentWillUnmount(){
        clearInterval(this.onPlaybackStatusUpdateInterval)
    }

    setStatusSync({shouldPlay, positionMillis}){
        if(positionMillis!=undefined){
            this.progress.last=Math.max(0,positionMillis-(this.progress.current-this.progress.last))
            this.progress.current=positionMillis
        }

        if(shouldPlay!=undefined){
            if(shouldPlay!=this.status.shouldPlay){
                if(shouldPlay){
                    this.status.shouldPlay=true
                    this.status.isPlaying=true
                    this.progress.setValue(this.progress.current)
                    this.progressing=Animated.timing(this.progress, {
                        toValue: this.status.durationMillis,
                        duration:this.status.durationMillis-this.progress.current,
                        easing: Easing.linear,
                        useNativeDriver:true,
                    })
                    this.progressing.start(finished=>{
                        if(finished){
                            this.setState({didJustFinish:true})
                            this.onPlaybackStatusUpdate({isPlaying:false})
                            this.progress.setValue(0)
                            this.progress.current=0
                            this.progress.last=0
                            this.status.isPlaying=false
                        }
                    })
                }else{
                    this.progressing?.stop()
                    this.status.isPlaying=false
                    this.status.shouldPlay=false
                    this.onPlaybackStatusUpdate()
                }
            }
        }else if(this.status.shouldPlay && positionMillis!=undefined){
            this.progressing.stop()
            this.status.shouldPlay=false
            this.setStatusSync({shouldPlay:true})
        } 
    }

    setStatusAsync(){
        setTimeout(()=>this.setStatusSync(...arguments),0)
    }

    render(){
        const {isLoaded,positionMillis,isPlaying,rate,volume,durationMillis,didJustFinish}=this.status
        const {thumb, posterSource=thumb, source, ...props}=this.props

        return (
            <View {...props}>
                {!!posterSource && (<Image source={posterSource} 
                    style={{position:"absolute",width:"100%",height:"100%"}}/>)}
                
            </View>
        )
    }

    playAt(positionMillis){

    }

    speak(){

    }

    image(){

    }
}

export const Widget=React.forwardRef(({slug, ...props},ref)=>{
    const ThisWidget=globalThis.Widgets[slug]
    return <ThisWidget ref={ref} {...props}/>
})

