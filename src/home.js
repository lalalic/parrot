import React from "react"
import { View, Text } from "react-native"
import { useDispatch, useSelector } from "react-redux"
import { Link } from "react-router-native"
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
    const dispatch = useDispatch()
    const {youtubetalk}=useSelector(state=>state.history)

    if(!youtubetalk)
        return <View></View>
    return (
        <View>
            <Link to={`/talk/youtubepotential/general/${youtubetalk}`}
                onPress={e=>dispatch({type:"history", youtubetalk:""})}
                >
                <Text>There's a potential Youtube talk. click here if you want to import.</Text>
            </Link>
        </View>
    )
}