import React from "react"
import * as Speech from "expo-speech"
import { ListMedia as Media } from "./media";
import { Text } from "react-native";

export default class NumberPractice extends Media {
    static defaultProps = {
        ...super.defaultProps,
        id: "number",
        slug: "number",
        title: "Practice Number Sensitivity",
        thumb: require("../../assets/favicon.png"),
        description: "This widget will speak numbers ramdomly, and you have to repeat it and recognized",
        source:"100,999999,5",
        policy:{whitespace:1,autoHide:false,chunk:1},
        controls:{whitespace:true,slow:false,record:false,video:false,caption:false,volume:false,speed:false,  chunk:false, maximize:false,subtitle:true},
    }

    static Durations={}

    componentDidMount(){
        (async()=>{
            await this.createTranscript()
            super.componentDidMount(...arguments)
        })()
    }

    onPlaybackStatusUpdateMore(){
        return {i:this.state.i}
    }

    onPositionMillis(positionMillis){
        const i =this.cues?.findIndex(a=>a.end>=(positionMillis-this.offsetTorlorance))
        if(this.state.i!=i){
            this.progress.manual=0
            this.setState({i})
        }else{
            this.setState({i:i+this.progress.manual})
        }
    }

    measureTime(text){
        const Cache=this.constructor.Durations
        const cache=Cache[text] || Cache[text.length+""]
        if(cache){
            return cache
        }
        return new Promise((resolve)=>{
            const start=Date.now()
            const timer=setTimeout(e=>resolve(Cache[text.length+""]=Date.now()-start),text.length*500)
            Speech.speak(text,{
                volume:0,
                onDone:()=>{
                    clearTimeout(timer)
                    resolve(Cache[text]=Date.now()-start+100)
                }
            })
        })
    }

    async createTranscript(){
        const [min = 0, max = 10000000, amount = 20] = this.props.source?.split(",").map(a=>parseInt(a))
        this.params=Object.assign(this.params,{ min, max, amount})
        
        let time=500
        this.cues=[]
        for(let i=0;i<amount;i++){
            const text=`${Math.floor(min+Math.random()*(max-min))}`
            const dur=await this.measureTime(text)
            const end=time+dur
            this.cues[i]={text,time,end}
            time=end+200
        }
        this.status.durationMillis=time
        this.onPlaybackStatusUpdate({transcript:[{cues:this.cues}], durationMillis:time})
    }

    renderAt(){ 
        const {rate, volume}=this.status
        const {i=-1}=this.state
        const text=this.cues[Math.floor(i)]?.text
        return i>=0 && (
            <Speak {...{text, key:i, rate, volume}}>
                <Text style={{fontSize:20, color:"red"}}>{i}: {text}</Text>
            </Speak>
        )
    }
}

const Speak=({text,style,children,...options})=>{
    React.useEffect(()=>{
        if(text){
            Speech.speak(text,options)
            return ()=>Speech.stop()
        }
    },[text])
    return children||null
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
