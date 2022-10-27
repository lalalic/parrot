import React from 'react';
import { View, Text, Pressable, FlatList, useColorScheme } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import {useLocation, useNavigate} from "react-router-native"

export const PressableIcon = ({ onPress, onLongPress, onPressOut, ...props }) => (
    <Pressable {...{ onPress, onLongPress, onPressOut }}>
        <MaterialIcons   {...props} />
    </Pressable>
);

export const PlayButton = (props) => {
    const location = useLocation();
    const navigate= useNavigate()
    const [slug, setSlug] = React.useState();
    const [showPolicy, setShowPolicy] = React.useState(false);
    const [policy, setPolicy] = React.useState("general");
    React.useEffect(() => {
        if (location.pathname.startsWith("/talk")) {
            const [,,slug,autoplay,policy]=location.pathname.split("/")
            setSlug(slug)
            if(autoplay=="autoplay" && policy){
                setPolicy(policy)
            }
        }
    }, [location]);

    return (
        <View {...props}>
            {!showPolicy && !!policy && policy!="general" && 
                <MaterialIcons size={40} name={PolicyIcons[policy]} 
                    style={{opacity:0.3,position:"absolute",top:8,borderRadius:20,borderWidth:3,borderColor:"white"}} 
                    color={"red"}/>}
            <PressableIcon size={32} style={{}}
                name="play-arrow" 
                color={slug ? undefined : "transparent"}
                onPress={() => navigate(`${location}?autoplay=true`,{replace:true})}
                onLongPress={() => setShowPolicy(!showPolicy)} 
                />

            {showPolicy && <FlatList style={{position:"absolute",bottom:40,left:0}}
                data={["general","shadowing","dictating","retelling"]}
                renderItem={({index,item})=>(
                    <Pressable style={{flexDirection:"row", height:40}} 
                        onPress={e=>{
                            setShowPolicy(false)
                            navigate(`/talk/${slug}/autoplay/${item}`)
                        }}>
                        <MaterialIcons name={PolicyIcons[item]}  size={32}/>
                        <Text style={{marginLeft:10,lineHeight:32}}>{item}</Text>
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
                <Context.Provider value={{ getSliding: () => sliding, setSliding }}>
                    {children}
                </Context.Provider>
                {sliding && <Slider {...sliding.props} onValueChange={onSlideRef} />}
            </View>
        );
    }
    return SliderIcon
})(Date.now());