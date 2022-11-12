import React from "react"
import { Text } from "react-native";
import { ListMedia } from "./media";
import * as Speech from "../speech"
export default class NumberPractice extends ListMedia {
    static defaultProps = {
        ...super.defaultProps,
        id: "number",
        slug: "number",
        title: "Practice Number Sensitivity",
        thumb: require("../../assets/favicon.png"),
        description: "This widget will speak numbers ramdomly, and you have to repeat it and recognized",
        source:"100,999999,3",
        policy:{whitespace:1,autoHide:false,chunk:1},
        controls:{whitespace:true,slow:false,record:false,video:false,caption:false,volume:false,speed:false,  chunk:false, maximize:false,subtitle:true},
    }

    static Durations={}
    constructor(){
        super(...arguments)
        this.state.Durations=this.constructor.Durations
        Speech.setIgnoreSilentSwitch("ignore")
    }

    measureTime(text){
        const Cache=this.constructor.Durations
        const cache=false//Cache[text] || Cache[text.length+""]
        if(cache){
            return cache
        }
        return new Promise((resolve)=>{
            const start=Date.now()
            Speech.speak(text,{

                onDone:(e)=>resolve(Date.now()-start)
            })
        })
    }

    async createTranscript(){
        const [min = 0, max = 10000000, amount = 20] = this.props.source?.split(",").map(a=>parseInt(a))
        this.params=Object.assign(this.params,{ min, max, amount})
        //const step=await this.measureTime(max+"")
        let time=500
        this.cues=[]
        for(let i=0;i<amount;i++){
            const text=`${Math.floor(min+Math.random()*(max-min))}`
            const dur=await this.measureTime(text)
            const end=time+dur
            this.cues[i]={text,time,end}
            time=end+200
        }
        this.status.durationMillis=this.cues[this.cues.length-1].time+100
        this.onPlaybackStatusUpdate({
            transcript:[{cues:this.cues}], 
            durationMillis:this.status.durationMillis
        })
    }
}

export class PhoneNumber extends NumberPractice{
    static defaultProps = {
        ...super.defaultProps,
        id: "phonenumber",
        slug: "phonenumber",
        title: "Practice Phone Number Sensitivity",
        thumb: require("../../assets/favicon.png"),
        description: "This widget will speak phonenumbers ramdomly, and you have to repeat it and recognized",
    };
}
