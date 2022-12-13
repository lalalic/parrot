import * as FileSystem from "expo-file-system"
import { selectBook } from "../store"
import { ListMedia } from "./media"
import { PlaySound, Recognizer, Recorder } from "../components"
import { ManageList } from "./manage-list"
import { useDispatch } from "react-redux"


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
        const state=this.context.store.getState()
        this.tag=state.talks[this.props.id].tag
        const book=selectBook(state, this.slug, this.tag)
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
        return this.tag
    }

    renderAt({text, uri}, i){ 
        const {debug}=this.props
        const {rate, volume}=this.status
        return (
            <PlaySound {...{key:i, audio:uri, rate, volume}}>
                {debug && <Text style={{fontSize:20, color:"red"}}>{i}: {text}</Text>}
            </PlaySound>
        )
    }

    static Shortcut=()=><AudioBook.TagShortcut slug={AudioBook.defaultProps.slug}/>

    static Tags=props=><ListMedia.Tags talk={this.defaultProps} placeholder="Tag: to categorize your audio book" {...props}/>
    static ManageList=({slug="audiobook"})=>{
        const dispatch=useDispatch()
        return (
            <ManageList slug={slug}
                audioUri={item=>item.uri}
                actions={
                    <Recorder size={32}
                        onRecordUri={()=>`${FileSystem.documentDirectory}audiobook/${Date.now()}.wav`}
                        onRecord={({audio:uri, recognized:text, ...record})=>text && dispatch({type:"audiobook/record",uri,text, ...record})}
                        children={<Recognizer.Text style={{position:"absolute", left:0, top:-20, width:"100%", textAlign:"center"}}/>}
                    />
                }
            />
        )
    }
}
