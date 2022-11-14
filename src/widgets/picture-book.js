import { ListMedia } from "./media"
import { selectBook } from "../store"

export default class PictureBook extends ListMedia {
    static defaultProps = {
        ...super.defaultProps,
        id: "picturebook",
        slug: "picturebook",
        title: "Recognize your world",
        thumb: require("../../assets/widget-picture-book.jpeg"),
        description: "Recognize everything in your world",
        tags:["kitchen","food"]
    }

    createTranscript(){
        const book=selectBook(this.slug, this.props.tag)
        book.reduce((cues,{duration, text},i)=>{
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

    static Management=props=><ListMedia.Tags talk={this.defaultProps} placeholder="Tag: to categorize your picture book" {...props}/>
}
