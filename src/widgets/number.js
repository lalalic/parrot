import { Media } from "./media";

export default class NumberPractice extends Media {
    static defaultProps = {
        ...super.defaultProps,
        id: "number",
        slug: "number",
        title: "Practice Number Sensitivity",
        thumb: require("../../assets/favicon.png"),
        description: "This widget will speak numbers ramdomly, and you have to repeat it and recognized",
        source:"1,999999,20",
        policy:{whitespace:2,autoHide:true},
        controls:{nav:{slow:false},record:false,video:false,caption:false,volume:false,speed:true, whitespace:true, chunk:true, maximize:false},
    
    };

    static createTranscript(props) {
        return new this(props).createTranscript()
    }

    constructor({source}){
        super(...arguments)
        const [min = 0, max = 10000000, amount = 20] = source.split(",");
        this.params={ min, max, amount, step:String(max).length * 500, }
        this.durationMillis=this.params.step*amount
    }

    createTranscript(){
        const {min, max, amount, step}=this.params
        this.cues=new Array(amount).fill(0).map((z,i)=>{
            return {
                text:Math.floor(min+Math.random()*(max-min))+"",
                time:i*step,
                end: (i+1)*step-1,
            }
        })
        return this.transcript=[{cues:this.cues}]
    }

    playAt(positionMillis) {
        const i = Math.floor(positionMillis / this.params.step)
        if(i!=this.params.current){
            this.params.current=i
            this.speak(this.cues[i].text)
        }
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
