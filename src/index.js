import "./l10n"
import React from "react"
import { useSelector, useDispatch } from "react-redux"

import FlyMessage from "react-native-use-qili/components/FlyMessage"
import Login from "react-native-use-qili/components/Login"
import { Prompt } from "react-native-use-qili/components/Prompt"
import App from "react-native-use-qili/App"
import { isAdmin } from "react-native-use-qili/store";

import Router from "./router"
import Permissions from "./permissions"
import PreloadSound from "./components/preload-sound"
import { listeners, middlewares, reducers } from "./store"
import Queue from "./components/queue"
const l10n=globalThis.l10n

export default function Parrot(){
    return (
        <App {...{reducers, listeners, middlewares, colorScheme:"dark", tutorials, 
                serializableCheckIgnoreActions:["my/queue"],
                blacklist:["queue"],
            }}>
            <Login.Required iconSource={require("../assets/icon.png")}>
                <CheckAdmin/>
                <MotherLang>
                    <Router/>
                </MotherLang>
            </Login.Required>
            <Permissions/>
            <PreloadSound 
                ding={require("../assets/ding.mp3")} 
                celebrate={require("../assets/celebrate.mp3")}
                pop={require("../assets/pop.mp3")}/>
            <MotherLang/>
            <Queue style={{position:"absolute", bottom:0, width:"100%",height:20}}/>
            <FlyMessage/>
            <Prompt/>
        </App>
    )
}

function MotherLang({children}){
    const mylang=useSelector(state=>state.my.mylang)
    const [uiLang, setUILang]=React.useState(globalThis.l10n.getLanguage())
    React.useEffect(()=>{
        if(!mylang)
            return 
        globalThis.l10n.setLanguage(mylang)
        setUILang(globalThis.l10n.getLanguage())
    },[mylang])
    return !!children && React.cloneElement(children,{key:uiLang})
}

const tutorials=[
    {
        title:l10n["A player for language learner"],
        desc:l10n["This app is based on a professional player for language learner. It can control speed"],
        image:require('../assets/icon.png')
    },
    {
        title:l10n["Widgets"],
        desc:l10n["Dialog Book, Picture Book, Vocabulary Book, Chat and more"],
        image:require("../assets/widget-audio-book.jpeg") 
    },
    {
        title:l10n["Plan your study"],
        desc:l10n["You can quickly plan for 1 day, week, month just by copy"],
        image:require("../assets/widget-picture-book.png")
    }
]

function CheckAdmin(){
    const dispatch=useDispatch()
    React.useEffect(()=>{
        isAdmin().then(
            be=>dispatch({type:"my", payload:{isAdmin:be}}),
            e=>dispatch({type:"my", payload:{isAdmin:false}})
        )
    },[])
    return null
}
