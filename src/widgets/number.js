import React from "react"
import { useDispatch, useSelector } from "react-redux"
import { TaggedListMedia, TagList } from "./media";
import * as Speech from "../components/speech"
import { Speak } from "../components";

export default class NumberPractice extends TaggedListMedia {
    static defaultProps = {
        ...super.defaultProps,
        id: "number",
        slug: "number",
        title: "Number Sense",
        thumb: require("../../assets/widget-number.png"),
        description: "This widget will speak numbers ramdomly, and you have to repeat it and recognized",
        tag:"100,999999,3",
        shadowing:{whitespace:1,autoHide:false,chunk:1},
        general:{whitespace:1,autoHide:false,chunk:1},
        /*
        onRecordChunk({chunk, recognized}){
            if(chunk.text==recognized){
                dispatch({type:"challenge/remove", chunk})
            }else{
                dispatch({type:"challenge/add", chunk})
            }
        },
        */
        controls:{whitespace:true,slow:false,record:false,video:false,caption:false,volume:false,speed:false,  chunk:false, maximize:false,subtitle:true},
    }

    constructor(){
        super(...arguments)
        Speech.setIgnoreSilentSwitch("ignore")
    }

    title(){
        return this.props.tag
    }

    createTranscript(){
        const [min = 0, max = 10000000, amount = 20] = this.props.tag.split(",").map(a=>parseInt(a))
        for(let i=0;i<amount;i++){
            this.cues.push({text:`${Math.floor(min+Math.random()*(max-min))}`})
        }
    }

    renderAt({text}, i){ 
        return this.speak({text})
    }

    static Shortcut=undefined
    static TagManagement=props=>super.TagManagement({
        placeholder:"min,max,count, such as 100,200,5",
        onCreate:(talk,dispatch)=>{
            const [min, max, count]=talk.tag.split(/[,\s+]/g).map(a=>parseInt(a))
            if(!(max>min && count)){
                alert(`min,max,count(${talk.tag}) don't make sense`)
                return 
            }
            this.create({...talk, id:`${this.defaultProps.slug}_${min}_${max}_${count}`},dispatch)
        },
        ...props
    })
}