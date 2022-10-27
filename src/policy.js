import React from "react"
import {View, Text, StyleSheet, Pressable} from "react-native"
import { connect } from 'react-redux'
import {Ted} from "./store"
import Player from "./player"

export default connect(({policy})=>({policy}))(({policy,dispatch})=>{
    const {data:talk={}}=Ted.useTalkQuery(slug)
    const [target, setTarget]=React.useState("general")

    return (
        <View style={{flex:1}}>
            <Player style={{flex:1}} talk={talk} 
                policy={policy[target]} 
                onPolicyChange={policy=>dispatch({type:"policy",target, payload:policy})}
                /> 
            <View style={{flex:1, padding:10}}>
                <View style={{flexDirection:"row",justifyContent:"space-between", 
                    borderBottomWidth:1, borderColor:"black"}}>
                    {"general,shadowing,dictating,retelling".split(",").map(a=>(
                        <Pressable key={a} onPress={e=>setTarget(a)}>
                            <Text style={[styles.tab, a==target && styles.active]}>{a.toUpperCase()}</Text>
                        </Pressable>
                    ))}
                </View>

                <View style={{flexGrow:1,padding:20}}>
                    <Text style={{height:20}}>{policy[target].desc}</Text>
                    {JSON.stringify((({desc,...props})=>props)(policy[target]), null, "\t").replace(/[\{\}\",]/g,"").split("\n")
                        .map(a=>!!a && <Text key={a.split(":")[0].trim()} style={{paddingBottom:10}}>{a}</Text>)}
                </View>
            </View>
        </View>
    )
})

const slug="noah_raford_how_gaming_can_be_a_force_for_good"
const styles=StyleSheet.create({
    tab:{
    
    },
    active:{
        color:"blue"
    }
})
    


