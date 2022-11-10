import React from "react"
import {View, Text, Pressable} from "react-native"
import {useDispatch, useSelector } from 'react-redux'
import { Video } from "expo-av"
import * as FileSystem from "expo-file-system"
import { MaterialIcons } from '@expo/vector-icons';

import {Ted} from "./store"
import Player, { ControlIcons } from "./player"
import { ColorScheme } from "./default-style"

const slug="noah_raford_how_gaming_can_be_a_force_for_good"
export default ()=>{
    const dispatch=useDispatch()
    const color=React.useContext(ColorScheme)
    const policy=useSelector(state=>state.policy)
    const {data:talk={}}=Ted.useTalkQuery({slug})
    const [target, setTarget]=React.useState("general")

    return (
        <View style={{flex:1}}>
            <Player key={target}
                style={{flex:1}} 
                id={"example"}
                media={<Video 
                    posterSource={{uri:talk.thumb}} 
                    source={{uri:talk.resources?.hls.stream}} 
                    useNativeControls={false}
                    shouldCorrectPitch={true}
                    style={{flex:1}}
                    />}
                policy={policy[target]} 
                policyName={target}
                autoHide={false}
                transcript={talk.languages?.en?.transcript}
                onPolicyChange={policy=>dispatch({type:"policy",target, payload:policy})}
                onRecordChunkUri={()=>`${FileSystem.documentDirectory}example/${target}/audios/example.wav`}
                /> 
            <View style={{flex:1, padding:10}}>
                <View style={{flexDirection:"row",justifyContent:"space-between", 
                    borderBottomWidth:1, borderColor:"black"}}>
                    {"general,shadowing,dictating,retelling".split(",").map(a=>(
                        <Pressable key={a} onPress={e=>setTarget(a)}>
                            <Text style={{color:a==target ? color.active : color.inactive}}>{a.toUpperCase()}</Text>
                        </Pressable>
                    ))}
                </View>

                <View style={{flexGrow:1,padding:20}}>
                    <Text style={{paddingBottom:20}}>{policy[target].desc}</Text>
                    {JSON.stringify((({desc,...props})=>props)(policy[target]), null, "\t").replace(/[\{\}\",]/g,"").split("\n")
                        .filter(a=>!!a)
                        .map(a=>{
                            const [k,v, key=k.trim(), value=policy[target][key]]=a.split(":")
                            const text=(()=>{
                                if(typeof(value)=="boolean"){
                                    return (
                                        <Pressable style={{justifyContent:"center"}}
                                            onPress={e=>dispatch({type:"policy", target, payload:{[key]:!value}})}>
                                            <Text style={{paddingBottom:10,color:color.primary}}>{a.trim()}</Text>     
                                        </Pressable>
                                    )
                                }
                                return <Text style={{paddingBottom:10}}>{a.trim()}</Text>
                            })();
                            return (
                                <View key={key} style={{flexDirection:"row", height:30}}>
                                    <MaterialIcons name={ControlIcons[key]} size={24} style={{marginRight:10}}/>
                                    {text}
                                </View>
                            )
                        })}
                </View>
            </View>
        </View>
    )
}