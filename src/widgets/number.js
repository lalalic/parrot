import React from "react"
import { useDispatch, useSelector } from "react-redux"
import { ListMedia } from "./media";
import * as Speech from "../speech"
import { Speak } from "../components";

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
        onRecordChunk({chunk, recognized}){
            if(chunk.text==recognized){
                dispatch({type:"challenge/remove", chunk})
            }else{
                dispatch({type:"challenge/add", chunk})
            }
        },
        controls:{whitespace:true,slow:false,record:false,video:false,caption:false,volume:false,speed:false,  chunk:false, maximize:false,subtitle:true},
    }

    static Durations={}
    constructor(){
        super(...arguments)
        this.state.Durations=this.constructor.Durations
        Speech.setIgnoreSilentSwitch("ignore")
    }

    title(){
        return this.props.source
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

    renderAt({text}, i){ 
        const {debug}=this.props
        const {rate, volume}=this.status
        return (
            <Speak {...{text, key:i, rate, volume}}>
                {debug && <Text style={{fontSize:20, color:"red"}}>{i}: {text}</Text>}
            </Speak>
        )
    }

    static Management=()=>{
        const talk=this.defaultProps
        const slug=talk.slug
        const dispatch=useDispatch()
        const list=useSelector(state=>Object.values(state.talks).filter(a=>a.slug==slug && a.id!=slug))
        return (
            <ListMedia.List data={list} 
                placeholder="min,max,count, such as 100,200,5"
                onEndEditing={({nativeEvent:{text:param}})=>{
                    if(!param.trim())
                        return 
                    const [min, max, count]=param.split(/[,\s+]/g).map(a=>parseInt(a))
                    if(!(max>min && count))
                        return 
                    const source=`${min},${max},${count}`
                    if(-1!==list.findIndex((a)=>a.source==source))
                        return 
                    const id=`${talk.id}_${min}_${max}_${count}`
                    dispatch({type:"talk/toggle", talk:{...talk,id}, key:"source", value:source})
                    dispatch({type:"talk/toggle", talk:{...talk,id}, key:"shadowing", value:talk.shadowing})
                }}
                renderItemText={({source})=>source}/>
        )
    }

    static Actions=()=>{
        return null
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

    static Management=props=><NumberPractice.Management talk={this.defaultProps} {...props}/>
}