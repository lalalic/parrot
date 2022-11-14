import { selectAudioBook } from "../store"
import { ListMedia } from "./media";

export default class AudioBook extends ListMedia {
    static defaultProps = {
        ...super.defaultProps,
        id: "audiobook",
        slug: "audiobook",
        title: "Record audio as practice material",
        thumb: require("../../assets/widget-audio-book.jpeg"),
        description: "manage audio book with tags and practise them",
        tags:["Vocabulary","Speak","Grammar"],
    }

    createTranscript(){
        const audiobook=selectAudioBook(this.state.tag)
        audiobook.reduce((cues,{duration, text},i)=>{
            const time=i==0 ? 0 : cues[i-1].end
            cues.push({text, time, end:time+duration+this.offsetTolerance})
            return cues
        },this.cues)
    }

    componentDidUpdate(props, state){
        if(this.state.tag!=state.tag){
            this.doCreateTranscript()
        }
    }

    title(){
        return this.props.tag
    }

    static Management=props=><ListMedia.Tags talk={this.defaultProps} placeholder="Tag: to categorize your audio book" {...props}/>
}
