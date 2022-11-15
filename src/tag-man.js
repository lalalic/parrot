import React from "react"
import { FlatList, Pressable, TextInput, View, Text, ImageBackground, useWindowDimensions} from "react-native"
import { useDispatch, useSelector } from "react-redux"
import { useParams } from "react-router-native"
import * as ImagePicker from "expo-image-picker"
import * as ImageManipulator from "expo-image-manipulator"
import * as FileSystem from "expo-file-system"

import { PressableIcon } from "./components"
import { ColorScheme } from "./default-style"
import { ControlIcons, Recognizer } from "./player"


export default function TagMan({slug=useParams().slug, actions, listProps={}, ...props}){
    const color=React.useContext(ColorScheme)
    const dispatch=useDispatch()
    const [state, setState]=React.useReducer((state,action)=>({...state,...action}),{})
    const tags=useSelector(state=>Object.values(state.talks).filter(a=>a.slug==slug && a.id!=slug))
    const data=useSelector(state=>state[slug])
    const inputStyle={fontSize:20,height:30,color:color.text, backgroundColor:color.inactive,paddingLeft:10,marginLeft:10,marginRight:10}
    const renderItem=listProps.renderItem || React.useCallback(({item,tag})=>{
        return (
            <Pressable 
                onLongPress={e=>dispatch({type:`${slug}/remove`, uri:item.uri})}
                style={{flexDirection:"row", height:50}}>
                <PressableIcon name={item.tags?.includes(state.tag) ? "check-circle-outline" : "radio-button-unchecked"} 
                    onPress={e=>dispatch({type:`${slug}/tag`, uri:item.uri, tag:state.tag})}/>
                <View style={{justifyContent:"center",marginLeft:10}}>
                    <Text>{item.text}</Text>
                </View>
            </Pressable>
        )
    },[state.tag]);
    return (
        <View style={{flex:1,marginTop:20}}>
            <Text style={{textAlign:"center", height:20}}>{slug.toUpperCase()}</Text>
            <TextInput style={inputStyle} onChangeText={q=>setState({q})}/>
            <View style={{flexGrow:1}}>
                <FlatList data={data.filter(a=>!state.q || a.text.indexOf(state.q)!=-1)} 
                    extraData={`${state.q}-${state.tag}-${data.length}`}
                    keyExtractor={a=>a.uri}
                    {...listProps}
                    renderItem={props=>renderItem({...props,tag:state.tag})}
                    />
            </View>
            <View style={{height:50, flexDirection:"row", justifyContent:"space-around"}}>
                <PressableIcon name="delete-outline" label=" " disabled={!!state.tag}/>
                {actions}
                <PressableIcon name="edit" label={state.tag}
                    onLongPress={e=>setState({tag:null})}
                    onPress={e=>setState({listing:!state.listing})}/>
                {state.listing && <FlatList data={tags} keyExtractor={a=>a.tag}
                    style={{position:"absolute",right:40,bottom:50, backgroundColor:color.inactive,padding:10}}
                    renderItem={({item})=>(
                        <Pressable style={{height:40, justifyContent:"center"}}
                            onPress={e=>setState({listing:false, tag:item.tag})}>
                            <Text style={{fontSize:16}}>{item.tag}</Text>
                        </Pressable>
                    )}/>}
            </View>
        </View>
    )
}

export function PictureBookMan({}){
    const color=React.useContext(ColorScheme)
    const slug="picturebook"
    const dispatch=useDispatch()
    const {width}=useWindowDimensions()
    const thumbStyle={flex:1,height:width/2, padding:10}
    const options={
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0,
        allowsMultipleSelection:true,
    }
    const actions=[{resize:{width:400}}]
    const saveOptions={
        compress:0,
        format:"jpeg"
    }
    const resize=React.useCallback(async (select)=>{
        const result=await ImageManipulator.manipulateAsync(select.uri,actions, saveOptions)
        FileSystem.deleteAsync(select.uri,{idempotent:true})
        return result
    },[])
    
    return (
        <TagMan 
            slug={slug}
            actions={<PressableIcon name="add-a-photo" 
                onPress={e=>{
                    (async()=>{
                        const select=await ImagePicker.launchCameraAsync(options)
                        if(select.cancelled)
                            return 
                        const result=await resize(select)
                        dispatch({type:"picturebook/record", uri:result.uri})
                    })()
                }}
                onLongPress={e=>{
                    (async ()=>{
                        const select = await ImagePicker.launchImageLibraryAsync(options)
                        if(select.cancelled)
                            return 
                        select.selected.forEach(a=>{
                            (async ()=>{
                                const result=await resize(a)
                                dispatch({type:"picturebook/record", uri:result.uri})
                            })()
                        })
                    })();
                }}/>}
            listProps={{
                numColumns:2,
                renderItem:({item,tag})=>(
                    <Pressable style={[{flex:1,flexDirection:"row", justifyContent:"center",paddingBottom:40},thumbStyle]}
                        onLongPress={e=>dispatch({type:`${slug}/remove`, uri:item.uri})}
                        >
                        <ImageBackground source={item} style={{flex:1}}>
                            <PressableIcon name={item.tags?.includes(tag) ? "check-circle-outline" : "radio-button-unchecked"} 
                                    onPress={e=>dispatch({type:`${slug}/tag`, uri:item.uri, tag})}/>
                            
                            <Recorder uri={item.uri} text={item.text} audio={item.audio}/>
                        </ImageBackground>
                    </Pressable>
                ),
            }}
        />
    )
}

function Recorder({uri,audio, text="Kitchen"}){
    const color=React.useContext(ColorScheme)
    const dispatch=useDispatch()
    const textStyle={bottom:-20,textAlign:"center"}
    const [state, setState]=React.useReducer((state,action)=>({...state,...action}),{recording:false,audio,text})
    return (
        <>
            <PressableIcon style={{flexGrow:1,flex:1}} size={40} 
                color={state.recording ? "red" : (state.audio ? color.primary : undefined)}
                name={ControlIcons.record} 
                onPressIn={e=>{
                    setState({recording:true, audio:state.audio||`${FileSystem.documentDirectory}picturebook/${Date.now()}.wav`})
                }}
                onPressOut={e=>{
                    setState({recording:false})
                }}
                />                       
            {state.recording && <Recognizer uri={state.audio} text={state.text} style={textStyle}
                    onRecord={({recognized:text,uri:audio, ...props})=>{
                        setState({recording:false, audio, text})
                        setTimeout(()=>dispatch({type:"picturebook/set",uri, text, audio, ...props}), 0)   
                    }}/>
                }
            {!state.recording && (<Text style={textStyle}>{state.text}</Text>)}
        </>
    )
}

