import { selectBook } from "../store"
import { ListMedia } from "./media"
import { PlaySound } from "../components"

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
        const book=selectBook(this.slug, this.props.tag)
        book.reduce((cues,{duration, ...cue},i)=>{
            const time=i==0 ? 0 : cues[i-1].end
            cues.push({time, end:time+duration+this.offsetTolerance, ...cue})
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

    renderAt({text, uri}, i){ 
        const {debug}=this.props
        const {rate, volume}=this.status
        return (
            <PlaySound {...{text, key:i, audio:uri, rate, volume}}>
                {debug && <Text style={{fontSize:20, color:"red"}}>{i}: {text}</Text>}
            </PlaySound>
        )
    }

    static Shortcut=()=><AudioBook.TagShortcut slug={AudioBook.defaultProps.slug}/>

    static Management=props=><ListMedia.Tags talk={this.defaultProps} placeholder="Tag: to categorize your audio book" {...props}/>
}
