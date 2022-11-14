import React from "react"
import { View, Text, Pressable } from "react-native"
import * as FileSystem from "expo-file-system"
import Talks from "./talks"
import Widgets from "./widgets"
import { Recognizer, ControlIcons } from "./player"
import { PressableIcon, Swipeable } from "./components"
import { ColorScheme } from "./default-style"
import { useDispatch, useSelector } from "react-redux"

export default ()=>(
    <View style={{flex:1}}>
        <Talks style={{flex:1}}/>
        <Widgets style={{flex:1}}/>
        <AudioMemo style={{height:50}}/>
    </View>
)

const AudioMemo=({textStyle, style})=>{
    const color=React.useContext(ColorScheme)
    const dispatch=useDispatch()
    const [state, setState]=React.useState({recording:false, recognized:"", tags:[]})
    const desc="Audio Book: record audio"
    const btnWidth=50
    const tags=useSelector(state=>{
        return Object.values(state.talks)
            .filter(a=>a.slug=="audiobook")
            .map(a=>a.tag)
    })
    return (
        <View style={[{flexDirection:"row", justifyContent:"center",backgroundColor:color.inactive},style]}>
            <View style={{width:btnWidth, justifyContent:"center"}}>
                <PressableIcon
                    color={state.recording ? "red" : color.active}
                    name={ControlIcons.record} size={32} 
                    onPressIn={e=>{
                        setState({recording:true, uri:`${FileSystem.documentDirectory}audiobook/${Date.now()}.wav`})
                    }}
                    onPressOut={e=>{
                        setState({...state, recording:false})
                    }}
                    />
            </View>
            <View style={{justifyContent:"center",fontSize:16, flexGrow:1}}>
                {state.recording && <Recognizer uri={state.uri} style={textStyle}
                    onRecord={({recognized,...props})=>{
                        setState({...state,recording:false, tags:[],recognized, ...props})
                        dispatch({type:"audiobook/record",text:recognized, ...props})
                    }}/>
                }
                {!state.recording && state.recognized &&(
                    <Swipeable 
                        style={{backgroundColor:color.inactive}}
                        onLongPress={e=>{
                            dispatch({type:"audiobook/remove", uri:state.uri})
                            setState({...state, uri:null, tags:[], recognized:""})
                        }}
                        rightContent={
                            <View style={{ flexWrap:"nowrap", flexDirection:"row", backgroundColor:color.backgroundColor, justifyContent:"space-around",height:"100%"}}>
                                {tags.map(tag=>(
                                    <Pressable key={tag} style={{justifyContent:"center",padding:4}}
                                        onPress={e=>{
                                                dispatch({type:"audiobook/tag",tag,uri:state.uri})
                                                setState({...state, tags:[...state.tags, tag]})
                                            }}>
                                        <Text style={{color:state.tags.includes(tag) ? color.primary : color.text}}>{tag}</Text>
                                    </Pressable>
                                ))}
                            </View>
                    }>
                        <Text style={[{color:color.primary},textStyle]}>{state.recognized}</Text>
                    </Swipeable>
                )}
                {!state.recording && !state.recognized &&(
                    <Text style={[textStyle]}>{desc}</Text>
                )}
            </View>
        </View>
    )
}