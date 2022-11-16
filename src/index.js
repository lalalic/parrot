import React from "react"
import Router from "./router"
import {Provider} from "./store"
import setDefaultStyle, {ColorScheme} from "./default-style"

export default ()=>{
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
}
