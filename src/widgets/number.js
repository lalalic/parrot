import React from "react"
import { useDispatch, useSelector } from "react-redux"
import { ListMedia, TagList } from "./media";
import * as Speech from "../components/speech"
import { Speak } from "../components";

export default class NumberPractice extends ListMedia {
    static defaultProps = {
        ...super.defaultProps,
        id: "number",
        slug: "number",
        title: "Number Sense",
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

    createTranscript(){
        const [min = 0, max = 10000000, amount = 20] = this.props.source?.split(",").map(a=>parseInt(a))
        for(let i=0;i<amount;i++){
            this.cues.push({text:`${Math.floor(min+Math.random()*(max-min))}`})
        }
    }

    componentWillUnmount(){
        super.componentWillUnmount?.(...arguments)
        Speech.stop()
    }

    renderAt({text}, i){ 
        return this.speak({text})
    }

    static TagManagement=()=>{
        const {id, slug, title, thumb, shadowing}=this.defaultProps
        const dispatch=useDispatch()
        const list=useSelector(state=>Object.values(state.talks).filter(a=>a.slug==slug && a.id!=slug))
        return (
            <TagList data={list} 
                placeholder="min,max,count, such as 100,200,5"
                onEndEditing={({nativeEvent:{text:param}})=>{
                    if(!param.trim())
                        return 
                    const [min, max, count]=param.split(/[,\s+]/g).map(a=>parseInt(a))
                    if(!(max>min && count)){
                        alert(`min,max,count(${param}) don't make sense`)
                        return 
                    }
                    const source=`${min},${max},${count}`
                    if(-1!==list.findIndex((a)=>a.source==source)){
                        alert(`You already have the same one.`)
                        return 
                    }
                    dispatch({type:"talk/toggle", talk:{id:`${id}_${min}_${max}_${count}`, slug, title, thumb}, payload:{source, shadowing}})
                }}
                renderItemText={({source})=>source}/>
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

    static TagManagement=props=><NumberPractice.TagManagement talk={this.defaultProps} {...props}/>
}