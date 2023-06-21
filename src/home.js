import React from "react"
import { View } from "react-native"
import Talks from "./talks"
import Widgets from "./widgets"
import { Monitor } from "./components"

export default ()=>(
    <View style={{flex:1}}>
        <Talks style={{flex:1}}/>
        <Monitor/>
        <Widgets style={{flex:1}}/>
    </View>
)