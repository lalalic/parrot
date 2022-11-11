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
        source:"1,999999,10",
        policy:{whitespace:2,autoHide:false,chunk:1},
        controls:{whitespace:true,slow:false,record:false,video:false,caption:false,volume:false,speed:false,  chunk:false, maximize:false,subtitle:true},
    };

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
        const i =this.cues?.findIndex(a=>a.end>=(positionMillis-150))
        if(this.state.i!=i){
            this.progress.manual=0
            this.setState({i})
        }else{
            this.setState({i:i+this.progress.manual})
        }
    }

    measureTime(text){
        return new Promise((resolve)=>{
            const start=Date.now()
            const timer=setTimeout(e=>resolve(Date.now()-start),text.length*500)
            Speech.speak(text,{
                volume:0,
                onDone:()=>{
                    clearTimeout(timer)
                    resolve(Date.now()-start+100)
                }
            })
        })
    }

    async createTranscript(){
        const [min = 0, max = 10000000, amount = 20] = this.props.source?.split(",").map(a=>parseInt(a))
        const step=await this.measureTime(max+"")
        this.params=Object.assign(this.params,{ min, max, amount, step})
        
        let time=500
        this.cues=[]
        for(let i=0;i<amount;i++){
            const text=`${Math.floor(min+Math.random()*(max-min))}`
            const dur=step//await this.measureTime(text)
            const end=time+dur
            this.cues[i]={text,time,end}
            time=end+100
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
