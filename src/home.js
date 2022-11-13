import React from "react"
import { View, Text } from "react-native"
import * as FileSystem from "expo-file-system"
import Talks from "./talks"
import Widgets from "./widgets"
import { Recognizer, ControlIcons } from "./player"
import { PressableIcon, Swipeable } from "./components"
import { ColorScheme } from "./default-style"
import { useDispatch } from "react-redux"

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
    const [state, setState]=React.useState({recording:false})
    const desc="Audio Book: record audio"
    const btnWidth=50
    return (
        <View style={[{flexDirection:"row", justifyContent:"center",backgroundColor:color.inactive},style]}>
            <View style={{width:btnWidth, justifyContent:"center"}}>
                <PressableIcon
                    color={state.recording ? "red" : color.active}
                    name={ControlIcons.record} size={32} 
                    onPressIn={e=>{
                        setState({recording:true, uri:`${FileSystem.documentDirectory}audiobook/${id}.wav`})
                    }}
                    onPressOut={e=>{
                        setState({...state, recording:false})
                    }}
                    />
            </View>
            <View style={{justifyContent:"center",fontSize:16, flexGrow:1}}>
                {state.recording && <Recognizer uri={state.uri} style={textStyle}
                    onRecord={({recognized,...props})=>{
                        setState({...state,recording:false, recognized})
                        dispatch({type:"audiobook/record",text:recognized, ...props})
                    }}
                    />
                }
                {state.recording && state.recognized &&(
                    <Swipeable 
                        rightContent={
                            <View style={{}}>
                                <PressableIcon name="clear" color="blue"/>
                                <PressableIcon name="clear" color="red"/>
                                <PressableIcon name="clear" color="red"/>
                            </View>
                        }>
                        <Text style={[{color:color.primary,width:"100%",height:"100%",backgroundColor:"blue"},textStyle]}>{state.recognized||"how are you"}</Text>
                    </Swipeable>
                )}
                {!state.recording && !state.recognized &&(
                    <Text style={[textStyle]}>{desc}</Text>
                )}
            </View>
        </View>
    )
}