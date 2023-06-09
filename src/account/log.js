import React from "react"
import { Text, ScrollView } from "react-native"
import * as FileSystem from "expo-file-system"

export default ({})=>{
    const [logs, setLogs]=React.useState([])
    React.useEffect(()=>{
        (async (logFile)=>{
            if(logFile){
                const content=await FileSystem.readAsStringAsync(logFile)
                setLogs(content.split("\n").reverse().join("\n"))
            }
        })(globalThis.logFile);
    },[])

    return (
        <ScrollView style={{flex:1}}>
            <Text>{logs}</Text>
        </ScrollView>
    )
}