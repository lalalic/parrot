import React from "react"
import { useColorScheme } from "react-native"
import Router from "./src/router"
import {Provider} from "./src/store"
import setDefaultStyle from "./src/default-style"

export default ()=>{
    const scheme="dark"/useColorScheme()
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
            }
        })
    },[scheme])

    return  (
        <Provider>
            <Router scheme={scheme}/>
        </Provider>
    )
}