import { Image, View } from "react-native"
import { ListMedia } from "./media"
import { selectBook } from "../store"
import { PlaySound } from "../components"

/**
 * some may not have audio, but the image is able to be shown
 */
export default class PictureBook extends ListMedia {
    static defaultProps = {
        ...super.defaultProps,
        id: "picturebook",
        slug: "picturebook",
        title: "Recognize your world",
        thumb: require("../../assets/widget-picture-book.jpeg"),
        description: "Recognize everything in your world",
        tags:["kitchen","food"],
        onRecordChunk({chunk, recognized}){
            if(chunk.text==recognized){
                dispatch({type:"challenge/remove", chunk})
            }else{
                dispatch({type:"challenge/add", chunk})
            }
        },
    }

    createTranscript(){
        const book=selectBook(this.context.store.getState(), this.slug, this.props.tag)
        book.reduce((cues,{duration=2000, ...cue},i)=>{
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

    render() {
        const { thumb, posterSource = thumb, source, title, ...props } = this.props
        return (
            <View {...props} style={{width:"100%",height:"100%",paddingTop:50, paddingBottom:50}}>
                {this.doRenderAt()}
            </View>
        )
    }

    renderAt({uri, audio}, i){ 
        const {rate, volume}=this.status
        return (
            <PlaySound {...{key:i, audio, rate, volume}}>
                <Image source={{uri}} style={{flex:1}}/>
            </PlaySound>
        )
    }

    static Shortcut=()=><PictureBook.TagShortcut slug={PictureBook.defaultProps.slug}/>

    static Management=props=><ListMedia.Tags talk={PictureBook.defaultProps} placeholder="Tag: to categorize your picture book" {...props}/>
}
