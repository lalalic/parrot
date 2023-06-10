import React from "react"
import { View, Text } from "react-native"
import Project from "../../package.json"

export default function About({}){
    return (
        <View style={{flex:1, alignItems:"center", justifyContent:"center"}}>
            <Text>version: {Project.version}</Text>
        </View>
    )
}