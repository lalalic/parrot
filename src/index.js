import React from "react"
import { AppRegistry } from "react-native";
import { registerRootComponent } from 'expo';

import "./widgets"
import Router from "./router"
import {Provider} from "./store"
import setDefaultStyle, {ColorScheme} from "./default-style"

//const registerRootComponent=Root=>AppRegistry.registerComponent('main', Root)

registerRootComponent(()=>{
    const scheme="dark"//useColorScheme()
    const [style, setStyle]=React.useState({})
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

    return  (
        <Provider>
            <ColorScheme.Provider key={scheme} value={style}>
                <Router/>
            </ColorScheme.Provider>
        </Provider>
    )
});
