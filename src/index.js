import "./l10n"
import React from "react"
import { View } from "react-native"
import { useSelector } from "react-redux"

import { hasChatGPTAccount, isAdmin } from "react-native-use-qili/store"
import ChatProvider from "react-native-use-qili/components/ChatProvider"
import FlyMessage from "react-native-use-qili/components/FlyMessage"
import Login from "react-native-use-qili/components/Login"
import App from "react-native-use-qili/App"

import Router from "./router"
import Permissions from "./permissions"
import { listeners, middlewares, reducers } from "./store"

export default function Parrot(){
    return (
        <App {...{reducers, listeners, middlewares, colorScheme:"dark", tutorials, serializableCheckIgnoreActions:[]}}>
            <Login.Required iconSource={require("../assets/icon.png")}>
                <ChatProvider>
                    <Router/>
                </ChatProvider>
            </Login.Required>
            <FlyMessage/>
            <Permissions/>
            <AdminStatusHinter/>
        </App>
    )
}

function AdminStatusHinter(){
    const hasChatGPT=useSelector(state=>hasChatGPTAccount(state))
    const tedEnabled=useSelector(state=>state.my.api=="Ted")
    const [bAdmin, setAdmin]=React.useState(true)
    React.useEffect(()=>{
        (async ()=>setAdmin(await isAdmin()))();
    },[])

    return <View style={{
        width:"100%",
        position:"absolute",
        bottom:0,
        flexDirection:"row",
        height:2
    }}>
        <View style={{flex:1, backgroundColor:bAdmin ? "red" : "green",}}/>
        <View style={{flex:1, backgroundColor:hasChatGPT ? "green" : "transparent",}}/>
        <View style={{flex:1, backgroundColor:tedEnabled ? "green" : "transparent",}}/>
    </View>
}

const tutorials=[
    {
        title:"A player for language learner",
        desc:"This app is based on a professional player for language learner. It can control speed,",
        image:require('../assets/icon.png')
    },
    {
        title:"Widgets",
        desc:"Dialog Book, Picture Book, Vocabulary Book, Chat and more",
        image:require("../assets/widget-audio-book.jpeg") 
    },
    {
        title:"Plan your study",
        desc:"You can quickly plan for 1 day, week, month just by copy",
        image:require("../assets/widget-picture-book.png")
    }
]
 


