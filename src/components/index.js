import React from 'react';
import { View, Text, Pressable, Image, KeyboardAvoidingView as RNKeyboardAvoidingView} from "react-native";
import { useLocation, useNavigate} from "react-router-native"
import { useSelector } from "react-redux"

import { ColorScheme, TalkStyle } from 'react-native-use-qili/components/default-style'
import { selectPolicy, isOnlyAudio, Qili, TalkApi } from "../store"
import AutoShrinkNavBar from "react-native-use-qili/components/AutoShrinkNavBar";
import PressableIcon from "react-native-use-qili/components/PressableIcon";
import FlyMessage from "react-native-use-qili/components/FlyMessage"
import FlatList from "react-native-use-qili/components/FlatList"
import PolicyIcons from './PolicyIcons';
const l10n=globalThis.l10n

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

export function TalkThumb({item, children, style, imageStyle, durationStyle, titleStyle, text=true, opacity=0.6, getLinkUri, policy}){
    const asText=(b,a=v=>String(Math.floor(v)).padStart(2,'0'))=>`${a(b/60)}:${a(b%60)}`
    const {thumb,duration,title, slug}=item
    const navigate=useNavigate()
    const location=useLocation()
    const source=typeof(thumb)=="string" ? {uri:thumb} : thumb
    const onPress=e=>{
        if(getLinkUri){
            navigate(getLinkUri(item))
        }else{
            if(globalThis.Widgets[slug]?.defaultProps.isWidget){
                navigate(`/talk/${slug}/${policy||"shadowing"}/${item.id}`)
            }else{
                navigate(location.pathname,{replace:true, state:{id:item.id}})
                navigate(`/talk/${slug}/${policy||"general"}/${item.id}`)
            }
        }
    }
    return (
		<Pressable style={[TalkStyle.thumb, style]} onPress={onPress}>
            <View style={{flex:1, opacity}}>
                <Image resizeMode="cover" style={[TalkStyle.image,{height: text ? 90 : "100%"}, imageStyle]} source={source}/>
                
                {!!text && !!duration && durationStyle!==false && <Text  style={[TalkStyle.duration,{top:0},durationStyle]}>{asText(duration)}</Text>}
                {!!text && !!title && (titleStyle!==false || !source) && <Text  style={[TalkStyle.title,{overflow:"hidden",height:20},titleStyle]}>{l10n[title]}</Text>}
            </View>
            {children && React.cloneElement(children,{talk:item})}
		</Pressable>
	)
}

export function TalkSelector({thumbStyle={height:110,width:140}, durationStyle, titleStyle, imageStyle, selected, children, filter=a=>(a.favorited && a), emptyTitle="", style, ...props}){
    const talks=useSelector(({talks={}})=>{
        
        return Object.keys(talks).map(id=>{
            const talk=filter(talks[id])
            if(talk){
                const {id,title,slug,author,thumb,duration}=talk
                return {
                    id,title,slug,author,duration,isLocal:true,
                    thumb:thumb || globalThis.Widgets[slug]?.defaultProps?.thumb,
                }
            }
        }).filter(a=>!!a)
    })

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