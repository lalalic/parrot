import React from "react"
import { View, Text } from "react-native"
import Ted from "../store"

import { PressableIcon, TalkSelector } from "../components"

export default function Admin(){

    return (
        <TalkSelector horizontal={false} extraData={Date.now()}
            thumbStyle={{height:120,width:"48%"}}
            titleStyle={{height:40}}
            columnWrapperStyle={{justifyContent:"space-between"}}
            numColumns={2}>
            <Uploader/>
        </TalkSelector>
    )
}

function Uploader({talk:{id}}){
    const dispatch = useDispatch()
    const {data={}}=Ted.useSaved({id})
    if(data.saved==undefined)
        return null
    
    return <PressableIcon name={data.saved ? "favorite" :"favorite-outline"}
        style={{position:"absolute",top:30,left:30}}
        onPress={({id})=>dispatch({type:"talk/save"})}/>
}