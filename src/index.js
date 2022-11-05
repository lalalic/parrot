import React from "react"
import { registerRootComponent } from 'expo';

import Router from "./router"
import {Provider} from "./store"
import setDefaultStyle, {ColorScheme} from "./default-style"

registerRootComponent(()=>{
    const scheme="dark"//useColorScheme()
    const [style, setStyle]=React.useState({})
    React.useEffect(()=>{
        const color=scheme=="light" ? "black" : "white"
        const backgroundColor=scheme=="light" ? "white" : "black"
        const active=scheme=="light" ? "black" : "white"
        const primary=scheme=="light" ? "blue" : "yellow"
        const unactive="gray"
        
        setDefaultStyle({
            Text:{color},
            MaterialIcons:{
                color:unactive,
                size:24
            },
            ActivityIndicator:{
                color,
            }
        })
        setStyle({text:color,backgroundColor,active, unactive, primary, warn:"red"})
    },[scheme])

    return  (
        <Provider>
            <ColorScheme.Provider key={scheme} value={style}>
                <Router/>
            </ColorScheme.Provider>
        </Provider>
    )
});
