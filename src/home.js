import React from "react"
import { View, Text } from "react-native"
import { useDispatch, useSelector } from "react-redux"
import { Link } from "react-router-native"
import { useURL } from "expo-linking"
import Talks from "./talks"
import Widgets from "./widgets"

export default ()=>(
    <View style={{flex:1}}>
        <Talks style={{flex:1}}/>
        <Monitor/>
        <Widgets style={{flex:1}}/>
    </View>
)


const Monitor=({})=>{
    return (
        <View>
            <Text>&nbsp;</Text>
        </View>
    )
}