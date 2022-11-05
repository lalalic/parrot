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

export const TalkStyle={
	thumb:{
		margin:5,
		height: 220,
		width:240,
		borderWidth:1,
		borderRadius:10,
		overflow:"hidden"
	},
	image:{
		width:"100%",
		height:"90%",
	},
	duration:{
		position:"absolute",
		bottom:60,
		right:2,
	},
	title:{
		position:"absolute",
		bottom:0,
		padding:2
	}
}

if(!Date.prototype.getWeek){
    Date.prototype.getWeek=function(){
        if('_week' in this)
            return this._week
        const startDate = new Date(this.getFullYear(), 0, 1);
        const days = Math.floor((this - startDate) /(24 * 60 * 60 * 1000));
        return this._week=Math.ceil(days / 7)
    }

    Date.prototype.getHalfHour=function(){
        return this.getHours()*2+Math.floor(this.getMinutes()/30)
    }

    Date.prototype.setHalfHour=function(i){
        return new Date(this.getFullYear(), this.getMonth(), this.getDate(), Math.floor(i/2), (i%2)*30)
    }
}