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
        policy:{whitespace:2,autoHide:true,chunk:1, caption:true},
        controls:{slow:false,record:false,video:false,caption:false,volume:false,speed:true, whitespace:true, chunk:true, maximize:false,subtitle:true},
    
    };

    static createTranscript(media) {
        return new this(media.props).createTranscript()
    }

    componentDidMount(){
        this.createTranscript()
        super.componentDidMount(...arguments)
    }

    createTranscript(){
        const [min = 0, max = 10000000, amount = 20, step=String(max).length * 500] = this.props.source?.split(",").map(a=>parseInt(a))
        this.params={ min, max, amount, step}
        this.durationMillis=step*amount

        this.cues=[]
        for(let i=0;i<amount;i++){
            this.cues[i]={
                text:Math.floor(min+Math.random()*(max-min))+"",
                time:i*step,
                end: (i+1)*step-1,
            }
        }

        return this.transcript=[{cues:this.cues}]
    }

    playAt(positionMillis) {
        const i = Math.floor(positionMillis / this.params.step)
        if(i!=this.params.current && i<this.cues.length){
            this.params.current=i
            this.speak(this.cues[i]?.text)
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
