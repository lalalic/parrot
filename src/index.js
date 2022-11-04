import React from "react"
import { useColorScheme } from "react-native"
import { registerRootComponent } from 'expo';

import Router from "./router"
import {Provider} from "./store"
import setDefaultStyle from "./default-style"

registerRootComponent(()=>{
    const scheme="dark"//useColorScheme()
    React.useEffect(()=>{
        const color=scheme=="light" ? "black" : "white"
        setDefaultStyle({
            Text:{color},
            MaterialIcons:{
                color,
                size:24
            },
            ActivityIndicator:{
                color,
            },
        })
    },[scheme])

    return  (
        <Provider>
            <Router scheme={scheme}/>
        </Provider>
    )
});
