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
        const startDate = new Date(this.getFullYear(), 0, 1);
        const days = Math.floor((this - startDate) /(24 * 60 * 60 * 1000));
        return Math.ceil(days / 7)
    }

    Date.prototype.getHalfHour=function(){
        return this.getHours()*2+Math.floor(this.getMinutes()/30)
    }

    Date.prototype.setHalfHour=function(i){
        return new Date(this.getFullYear(), this.getMonth(), this.getDate(), Math.floor(i/2), (i%2)*30)
    }

    const pad=i=>String(i).padStart(2,"0")
    Date.prototype.asDateTimeString=function(){
        return `${this.asDateString()} ${this.asTimeString()}`
    }

    Date.prototype.asDateString=function(){
        return `${this.getFullYear()}-${pad(this.getMonth()+1)}-${pad(this.getDate())}`
    }

    Date.prototype.isSameWeek=function(that){
        return this.getWeek()==that?.getWeek() && this.getFullYear()==that?.getFullYear()
    }

    Date.prototype.switchWeek=function(that){
        const thisWeekDay=this.getDay()
        const thatWeekDay=that.getDay()
        this.switchDay(that)
        this.setTime(this.getTime()-(thatWeekDay-thisWeekDay)*24*60*60*1000)
        return this
    }

    Date.prototype.switchDay=function(that){
        this.setFullYear(that.getFullYear())
        this.setMonth(that.getMonth())
        this.setDate(that.getDate())
        return this
    }

    Date.prototype.asTimeString=function(){
        return `${pad(this.getHours())}:${pad(this.getMinutes())}:${pad(this.getSeconds())}`
    }

    Date.from=function(time){
        if(!time)
            return 
        const [y,m,...data]=time.split(/[-\s\:]/).map(a=>parseInt(a))
        return new Date(y, m-1, ...data)
    }

    Date.prototype.getMonthWeeks=function(){
        const firstDay=Date.from(`${this.getFullYear}-${this.getMonth()+1}-01`)
        return [firstDay, firstDay.nextDay(7), firstDay.nextDay(14), firstDay.nextDay(21), firstDay.nextDay(28)]
    }

    Date.prototype.nextDay=function(offset=1){
        return new Date(this.getTime()+offset*24*60*60*1000)
    }

    Date.fromWeek=function(year, week, day){
        const firstDay=Date.from(`${year}-1-1`)
        return firstDay.nextDay(week*7+day-firstDay.getDay())
    }
}

if(!Array.prototype.findLastIndex){
    Array.prototype.findLastIndex=function(evaluator){
        for(let i=this.length-1;i>-1;i--){
            if(!!evaluator(this[i],i,this)){
                return i
            }
        }
        return -1
    }
}