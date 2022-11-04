import React from "react"
import * as Components from "react-native"
import { MaterialIcons } from '@expo/vector-icons';


export default ({MaterialIcons:_MaterialIcons, ...styles}={}) => {
    if(_MaterialIcons){
        MaterialIcons.defaultProps={...MaterialIcons.defaultProps,..._MaterialIcons}
    }
    
    Object.keys(styles).forEach(A=>{
        const Component=Components[A]
        if(!Component)
            return 
        Component.render=(_render=>(props,...args)=>{
            return _render({
                ...props, 
                style:[styles[A],props.style],
            }, ...args)
        })(Component.render);
    })
}

export const ColorScheme=React.createContext({})