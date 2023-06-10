import React from "react"
import {View, Text, Pressable, TextInput, ScrollView, } from "react-native"
import {useDispatch, useSelector } from 'react-redux'
import { Video } from "expo-av"
import * as FileSystem from "expo-file-system"
import { MaterialIcons } from '@expo/vector-icons';

import { TalkApi } from "../store"
import { ControlIcons,  KeyboardAvoidingView} from "../components"
import Player from "../components/player"
import { ColorScheme } from "../components/default-style"

const slug="noah_raford_how_gaming_can_be_a_force_for_good"
export default function Policy(){
    const dispatch=useDispatch()
    const color=React.useContext(ColorScheme)
    const [target, setTarget]=React.useState("general")
    const policy=useSelector(state=>state.my.policy)
    const {data:talk={}}=TalkApi.useTalkQuery({slug})
    
    return (
        <KeyboardAvoidingView style={{flex:1}} behavior="padding">
            <Player key={target} style={{flex:1}} id={"example"}
                media={<Video 
                    posterSource={{uri:talk.thumb}} 
                    source={{uri:talk.video}} 
                    useNativeControls={false}
                    shouldCorrectPitch={true}
                    style={{flex:1}}
                    />}
                policy={{...policy.general, ...policy[target]}} 
                policyName={target}
                autoHide={false}
                transcript={talk.languages?.mine?.transcript}
                onPolicyChange={({name, desc, ...policy})=>dispatch({type:"policy",target, payload:policy})}
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

                <ScrollView style={{flexGrow:1,padding:20}}>
                    <Text style={{paddingBottom:20}}>{policy[target].desc}</Text>
                    {JSON.stringify((({desc,...props})=>props)(policy[target]), null, "\t").replace(/[\{\}\",]/g,"").split("\n")
                        .filter(a=>!!a)
                        .map(a=>{
                            const [k,v, key=k.trim(), value=policy[target][key]]=a.split(":")
                            const text=(()=>{
                                if(typeof(value)=="boolean"){
                                    return (
                                        <Pressable
                                            onPress={e=>dispatch({type:"policy", target, payload:{[key]:!value}})}>
                                            <Text style={{color:color.primary}}>{String(value)}</Text>     
                                        </Pressable>
                                    )
                                }else{
                                    return (
                                        <TextInput style={{flexGrow:1, color:color.primary}} defaultValue={String(value)} 
                                            inputMode="decimal" keyboardType="decimal-pad" contextMenuHidden={true}
                                            onEndEditing={({nativeEvent:{text}})=>{
                                                try{
                                                    const value=parseFloat(text)
                                                    if(value!=NaN){
                                                        dispatch({type:"policy", target, payload:{[key]:value}})
                                                    }
                                                }catch(e){

                                                }
                                            }}
                                            />
                                    )
                                }
                                
                            })();
                            return (
                                <View key={key} style={{flexDirection:"row", borderBottomWidth:1, borderBottomColor:"gray", height:40, alignItems:"center"}}>
                                    <MaterialIcons name={ControlIcons[key]||""} size={24} />
                                    <Text style={{width:120, textAlign:"right", marginRight:5}} numberOfLines={1}>{key.replace(/([A-Z])/g, " $1")}:</Text>
                                    {text}
                                </View>
                            )
                        })}
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    )
}