import React from "react"
import { SafeAreaView, LogBox, View, Text, Alert} from "react-native"
import { StatusBar } from "expo-status-bar"
import * as ExpoSplashScreen from 'expo-splash-screen'

import Router from "./router"
import {Provider, isAdminLogin, hasChatGPTAccount} from "./store"
import setDefaultStyle, {ColorScheme} from "./components/default-style"
import { Permissions } from "./permissions"
import { FlyMessage, Loading, ChatProvider } from "./components"
import { useSelector } from "react-redux";

LogBox.ignoreAllLogs()
ExpoSplashScreen.preventAutoHideAsync()

export default ()=>{
    const scheme="dark"//useColorScheme()
    const [style, setStyle]=React.useState({})
    const [dataReady, setDataReady]=React.useState(false)

    React.useEffect(()=>{
        const color=scheme=="light" ? "black" : "white"
        const backgroundColor=scheme=="light" ? "white" : "black"
        const active=scheme=="light" ? "black" : "white"
        const primary=scheme=="light" ? "blue" : "yellow"
        const inactive="gray"
        
        setDefaultStyle({
            Text:{color},
            MaterialIcons:{
                color:inactive,
                size:24
            },
            ActivityIndicator:{
                color,
            }
        })
        setStyle({text:color,backgroundColor,active, inactive, primary, warn:"red"})
    },[scheme])

    const content=React.useMemo(()=>{
        if(dataReady){
            const containerStyle={flex:1, backgroundColor:style.backgroundColor}
            return (
                <SafeAreaView onLayout={e=>ExpoSplashScreen.hideAsync()} style={containerStyle}>
                    <ColorScheme.Provider key={scheme} value={style}>
                        <ChatProvider>
                            <Router/>
                        </ChatProvider>
                    </ColorScheme.Provider>
                </SafeAreaView>
            )
        }
        return null
    },[dataReady, scheme])

    return  (
        <Provider onReady={e=>setDataReady(true)} loading={<Loading/>}>
            {content}
            <FlyMessage/>
            <Permissions/>
            <AdminHinter/>
            <StatusBar style="light"/>
        </Provider>
    )
}

function AdminHinter(){
    const [bAdmin,hasChatGPT]=useSelector(state=>[isAdminLogin(state),hasChatGPTAccount(state)])
    return <View style={{
        postion:"absolute",bottom:0,
        borderWidth:1,backgroundColor:bAdmin ? "red" : "transparent", 
        borderColor:hasChatGPT ? "green" : "transparent",
        width:"100%",
        height:2}}></View>
}


