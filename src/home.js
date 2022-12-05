import React from "react"
import { View } from "react-native"
import Talks from "./talks"
import Widgets from "./widgets"

export default ()=>(
    <View style={{flex:1}}>
        <Talks style={{flex:1}}/>
        <Widgets style={{flex:1}}/>
    </View>
)
