import React from "react"
import { ListMedia } from "./media";
import * as Speech from "../speech"
import { TextInput, View, Text, Pressable } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { ColorScheme } from "../default-style";
import { Link, useNavigate } from "react-router-native";
export default class NumberPractice extends ListMedia {
    static defaultProps = {
        ...super.defaultProps,
        id: "number",
        slug: "number",
        title: "Practice Number Sensitivity",
        thumb: require("../../assets/widget-number.png"),
        description: "This widget will speak numbers ramdomly, and you have to repeat it and recognized",
        source:"100,999999,3",
        shadowing:{whitespace:1,autoHide:false,chunk:1},
        general:{whitespace:1,autoHide:false,chunk:1},
        controls:{whitespace:true,slow:false,record:false,video:false,caption:false,volume:false,speed:false,  chunk:false, maximize:false,subtitle:true},
    }

    static Durations={}
    constructor(){
        super(...arguments)
        this.state.Durations=this.constructor.Durations
        Speech.setIgnoreSilentSwitch("ignore")
    }

    measureTime(text){
        return text.length*450
    }

    createTranscript(){
        const [min = 0, max = 10000000, amount = 20] = this.props.source?.split(",").map(a=>parseInt(a))
        this.params=Object.assign(this.params,{ min, max, amount})
        let time=500
        for(let i=0;i<amount;i++){
            const text=`${Math.floor(min+Math.random()*(max-min))}`
            const dur=this.measureTime(text)
            const end=time+dur
            this.cues[i]={text,time,end}
            time=end+200
        }
    }

    componentWillUnmount(){
        super.componentWillUnmount?.(...arguments)
        Speech.stop()
    }

    static Management({talk}){
        const {slug}=talk
        const Widget=globalThis.Widgets[slug]
        const color=React.useContext(ColorScheme)
        const dispatch=useDispatch()
        const navigate=useNavigate()
        const list=useSelector(state=>Object.values(state.talks).filter(a=>a.slug==slug && a.id!=slug))
        return (
            <View style={{marginTop:10, minHeight:200}}>
                <TextInput placeholder="New Practice:min,max,count, ex: 100,200,10"
                    style={{height:50, backgroundColor:color.inactive, paddingLeft:10, fontSize:16}}
                    onEndEditing={({nativeEvent:{text:param}})=>{
                        const [min, max, count]=param.split(/[,\s+]/g).map(a=>parseInt(a))
                        if(max>min && count){
                            if(-1==list.findIndex(({params:a})=>a.min==min && a.max==max && a.count==count)){
                                const id=`${Widget.defaultProps.id}_${min}_${max}_${count}`
                                dispatch({type:"talk/toggle", talk, id, key:"params", value:{min,max,count}})
                                dispatch({type:"talk/toggle", talk, id, key:"shadowing", shadowing:talk.shadowing})
                            }
                        }
                    }}/>
                {list.map(({id, params:{min, max, count}})=>(
                    <Pressable key={id} 
                        onPress={e=>navigate(`/talk/${slug}/shadowing/${id}`)} 
                        onLongPress={e=>dispatch({type:"talk/clear", id})}
                        style={{height:50, justifyContent:"center", paddingLeft:20}}>
                        <Text style={{fontSize:16}}>{count}: {min}-{max}</Text>
                    </Pressable>
                ))}
            </View>
        )
    }
}

export class PhoneNumber extends NumberPractice{
    static defaultProps = {
        ...super.defaultProps,
        id: "phonenumber",
        slug: "phonenumber",
        title: "Practice Phone Number Sensitivity",
        thumb: require("../../assets/widget-phone-number.jpeg"),
        description: "This widget will speak phonenumbers ramdomly, and you have to repeat it and recognized",
    }

    createTranscript(){
        super.createTranscript()
        this.cues.forEach(a=>a.text=a.text.replace(/./g,m=>m+" ").trim())    
    }
}
