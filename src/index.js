import React from "react"
import { SafeAreaView} from "react-native"
import { StatusBar } from "expo-status-bar"
import * as ImagePicker from "expo-image-picker"
import { Audio } from 'expo-av'
import * as ExpoSplashScreen from 'expo-splash-screen'
import SplashScreen from "./splash-screen"

import Router from "./router"
import {Provider} from "./store"
import setDefaultStyle, {ColorScheme} from "./default-style"


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
        <Provider onReady={e=>setDataReady(true)}>
            {!dataReady && <SplashScreen/>}
            {dataReady && <SafeAreaView 
                onLayout={onLayout}
                style={{flex:1, backgroundColor:style.backgroundColor}}>
                    <ColorScheme.Provider key={scheme} value={style}>
                        <Router/>
                    </ColorScheme.Provider>
                <StatusBar style="light"/>
                <Permissions/>
            </SafeAreaView>}
        </Provider>
    )
}


const Permissions=()=>{
    const [, requestCameraPermission] = ImagePicker.useCameraPermissions()
    const [, requestMediaLibPermission] = ImagePicker.useMediaLibraryPermissions();
    const [, requestRecordPermission] = Audio.usePermissions()

    React.useEffect(()=>{
        if(requestCameraPermission){
            requestCameraPermission()
        }
    },[requestCameraPermission,])

    React.useEffect(()=>{
        if(requestMediaLibPermission){
            requestMediaLibPermission()
        }
    },[requestMediaLibPermission])

    React.useEffect(()=>{
        if(requestRecordPermission){
            requestRecordPermission()
        }
    },[requestRecordPermission])
    return null
}
