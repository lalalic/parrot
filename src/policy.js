import React from "react"
import {View, Text, Pressable} from "react-native"
import {useDispatch, useSelector } from 'react-redux'
import {Ted} from "./store"
import Player from "./player"

const slug="noah_raford_how_gaming_can_be_a_force_for_good"
export default ()=>{
    const dispatch=useDispatch()
    const policy=useSelector(state=>state.policy)
    const {data:talk={}}=Ted.useTalkQuery(slug)
    const [target, setTarget]=React.useState("general")

    return (
        <View style={{flex:1}}>
            <Player style={{flex:1}} talk={talk} policy={policy[target]} autoHide={false}
                onPolicyChange={policy=>dispatch({type:"policy",target, payload:policy})}
                /> 
            <View style={{flex:1, padding:10}}>
                <View style={{flexDirection:"row",justifyContent:"space-between", 
                    borderBottomWidth:1, borderColor:"black"}}>
                    {"general,shadowing,dictating,retelling".split(",").map(a=>(
                        <Pressable key={a} onPress={e=>setTarget(a)}>
                            <Text style={{color:a==target ? "blue" : "white"}}>{a.toUpperCase()}</Text>
                        </Pressable>
                    ))}
                </View>

                <View style={{flexGrow:1,padding:20}}>
                    <Text style={{height:20}}>{policy[target].desc}</Text>
                    {JSON.stringify((({desc,...props})=>props)(policy[target]), null, "\t").replace(/[\{\}\",]/g,"").split("\n")
                        .filter(a=>!!a)
                        .map(a=>{
                            const [k,v, key=k.trim(), value=policy[target][key]]=a.split(":")
                            if(typeof(value)=="boolean"){
                                return (
                                    <Pressable onPress={e=>dispatch({type:"policy", target, payload:{[key]:!value}})} key={key}>
                                        <Text style={{paddingBottom:10,color:"yellow"}}>{a}</Text>     
                                    </Pressable>
                                )
                            }
                            return <Text key={k} style={{paddingBottom:10}}>{a}</Text>
                        })}
                </View>
            </View>
        </View>
    )
}