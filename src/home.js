import React from "react"
import { View } from "react-native"
import Talks from "./talks"
import Widgets from "./widgets"
import { TalkSelector } from "./components"

import { useDispatch } from "react-redux"
import PressableIcon from "react-native-use-qili/components/PressableIcon"


export default ()=>(
    <View style={{flex:1}}>
        <Talks style={{flex:1}}/>
        <View  style={{height:100}}>
            <TalkSelector 
                thumbStyle={{height:90, width:90}}  
                titleStyle={{height:0}}
                >
                <Toggle/>
            </TalkSelector>
        </View>
        <Widgets style={{flex:1}} horizontal={true}/>
    </View>
)

function Toggle({talk}){
    const dispatch = useDispatch()
    return <PressableIcon name="star" color="yellow"
        style={{position:"absolute",top:10,left:10, opacity:0.5}}
        onPress={({id})=>dispatch({type:"talk/toggle/favorited", talk})}/>
}