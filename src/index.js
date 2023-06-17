import React from "react"
import { SafeAreaView, LogBox, View} from "react-native"
import { StatusBar } from "expo-status-bar"
import * as ExpoSplashScreen from 'expo-splash-screen'

import Router from "./router"
import {Provider, isAdminLogin} from "./store"
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

    const onLayout=React.useCallback(async ()=>{
        if(dataReady){
            await ExpoSplashScreen.hideAsync()
        }
    },[dataReady])

    return  (
        <Provider onReady={e=>setDataReady(true)} loading={<Loading/>}>
            {dataReady && <SafeAreaView 
                onLayout={onLayout}
                style={{flex:1, backgroundColor:style.backgroundColor}}>
                    <ColorScheme.Provider key={scheme} value={style}>
                        <ChatProvider>
                            <Router/>
                        </ChatProvider>
                    </ColorScheme.Provider>
                <StatusBar style="light"/>
                <Permissions/>
            </SafeAreaView>}
            <FlyMessage/>
            <AdminHinter/>
        </Provider>
    )
}

function AdminHinter(){
    const bAdmin=useSelector(state=>isAdminLogin(state))
    if(!bAdmin)
        return null
    return <View style={{postion:"absolute",bottom:0,borderWidth:1,backgroundColor:"red", borderColor:"red",width:"100%",height:1}}></View>
}


