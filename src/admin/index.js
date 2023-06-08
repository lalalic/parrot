import React from "react"
import { useDispatch } from "react-redux"
import { FlyMessage, TalkSelector, Login } from "../components"

export default function Admin(){
    const dispatch=useDispatch()
    return (
        <TalkSelector horizontal={false} extraData={Date.now()}
            thumbStyle={{height:120,width:"48%"}}
            titleStyle={{height:40}}
            columnWrapperStyle={{justifyContent:"space-between"}}
            numColumns={2}>
        </TalkSelector>
    )
}


