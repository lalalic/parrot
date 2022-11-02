import React from 'react';
import { View, Text, Pressable, FlatList , Animated, Easing, } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import {useLocation, useNavigate, useParams} from "react-router-native"

export const PressableIcon = ({ onPress, onLongPress, onPressOut, ...props }) => (
    <Pressable {...{ onPress, onLongPress, onPressOut }}>
        <MaterialIcons   {...props} />
    </Pressable>
);

export const PlayButton = ({size=24, style, color, showPolicy=false, policyColor="red", onPress, name, ...props}) => {
    const navigate= useNavigate()
    const {slug, policy="general"}=useParams()
    const [showPolicyList, setShowPolicyList] = React.useState(false);
    
    const squareSize=size

    return (
        <View {...props}>
            <View style={{
                width:squareSize,height:squareSize,borderRadius:squareSize/2,borderWidth:1,
                borderColor:color||"white",justifyContent:"center",alignItems:"center"
                }}>
                {showPolicy && !!policy && policy!="general" && (
                    <View style={{position:"absolute",width:"100%", height:"100%",justifyContent:"center",alignItems:"center"}}>
                        <MaterialIcons size={size/1.5} name={PolicyIcons[policy]} color={policyColor}/>
                    </View>
                )}
                <PressableIcon size={size} name={name} color={color}
                    style={{opacity: !!policy && policy!="general" ? 0.4 : 1}}
                    onPress={e=> showPolicyList ? setShowPolicyList(false) : onPress(e)}
                    onLongPress={() => setShowPolicyList(!showPolicyList)} 
                    />
                
            </View>

            {showPolicyList && <FlatList style={{position:"absolute",bottom:40,left:-20, width:200, padding:10, backgroundColor:"black"}}
                data={["general","retelling","dictating", "shadowing"]}
                renderItem={({index,item})=>(
                    <Pressable style={{flexDirection:"row", height:60}} 
                        onPress={e=>{
                            setShowPolicyList(false)
                            navigate(`/talk/${slug}/${item}`,{replace:true})
                        }}>
                        <MaterialIcons name={PolicyIcons[item]}  size={32} color={policy==item ? "red" : undefined}/>
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

export const SliderIcon=(uuid=>{
    const Context = React.createContext({});

    function SliderIcon({ onToggle, onSlide, onSlideFinish, slider, icon, ...props }){
        const [id] = React.useState(uuid++);
        const { setSliding, getSliding } = React.useContext(Context);

        return (
            <PressableIcon onPress={onToggle} name={icon}
                onLongPress={e => setSliding({ id, onSlide, onSlideFinish, props: slider })}
                onPressOut={e => {
                    const sliding = getSliding();
                    sliding?.id == id && !sliding.started && setSliding();
                }}
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

    SliderIcon.Container = ({ children,onSliding, ...props }) => {
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
                        onSliding?.(e)
                        return true;
                    }
                }}

                onResponderMove={e => {
                    if (sliding) {
                        const value = sliding.get(e.nativeEvent.pageY - sliding.y0);
                        onSlideRef.current?.(value);
                        sliding.onSlide?.(value);
                        onSliding?.(e)
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
                <Context.Provider value={{ getSliding: () => sliding, setSliding }}>
                    {children}
                </Context.Provider>
                {sliding && <Slider {...sliding.props} onValueChange={onSlideRef} />}
            </View>
        );
    }
    return SliderIcon
})(Date.now());


export function AutoHide({show, style, children, timeout=2000, duration=1200, ...props}){
    const opacity = React.useRef(new Animated.Value(1)).current;
    const opacityTimeout=React.useRef()
    React.useEffect(()=>{
        if(!show)
            return 
        if(opacityTimeout.current){
            clearTimeout(opacityTimeout.current)
            opacityTimeout.current=null
        }
        opacity.setValue(1)
        opacityTimeout.current=setTimeout(()=>{
            opacityTimeout.current=null
            opacity.setValue(1)
            Animated.timing(opacity, {
                toValue: 0,
                duration,
                easing: Easing.linear,
                useNativeDriver:true,
            }).start();
        }, timeout)
    },[show])

    return (
        <Animated.View style={[style,{opacity}]} {...props}>
            {children}
        </Animated.View>
    )
}