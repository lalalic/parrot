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
import services from "./components/webview-services"
import { listeners, middlewares, reducers } from "./store"

export default function Parrot(){
    return (
        <App {...{reducers, listeners, middlewares, colorScheme:"dark"}}>
            <Login.Required>
                <ChatProvider services={services}>
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
    const [bAdmin, setAdmin]=React.useState(false)
    React.useEffect(()=>{
        (async ()=>setAdmin(await isAdmin()))();
    },[])
    
    if(!bAdmin)
        return null

    return <View style={{
        postion:"absolute",bottom:0,
        backgroundColor:bAdmin ? "red" : "transparent", 
        borderWidth:1,
        borderColor:hasChatGPT ? "green" : "transparent",
        width:"100%",
        height:2
    }}></View>
}


