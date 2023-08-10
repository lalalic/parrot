import React from "react"
import { useDispatch } from "react-redux"
import { TalkSelector } from "../components"
import PressableIcon from "react-native-use-qili/components/PressableIcon"

export default function Favorites({}){
    return (
        <TalkSelector horizontal={false} extraData={Date.now()}
            thumbStyle={{height:120,width:"48%"}}
            titleStyle={{height:40}}
            columnWrapperStyle={{justifyContent:"space-between"}}
            emptyTitle="No favorite yet!"
            numColumns={2}>
            <SetFavorite/>
        </TalkSelector>
    )
}

function SetFavorite({talk}){
    const dispatch = useDispatch()
    return <PressableIcon name={talk.favorited ? "favorite" :"favorite-outline"}
        style={{position:"absolute",top:30,left:30}}
        onPress={({id})=>dispatch({type:"talk/toggle", talk, key:"favorited"})}/>
}