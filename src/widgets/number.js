import { Media } from "../components";

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

    static createTranscript() {
        return [];
    }

    constructor({source}){
        super(...arguments)
        const [min = 0, max = 10000000, amount = 20] = source.split(",");
        this.params={ min, max, amount }
    }

    get durationMillis() {
        const { amount, max } = this.params;
        return String(max).length * 500 * amount;
    }

    getNumber(i){
        return 84734848
    }

    playAt(positionMillis) {
        const i = Math.floor(positionMillis / 500);
        const n = this.getNumber(i);
        this.speak(n);
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
