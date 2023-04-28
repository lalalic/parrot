import * as FileSystem from "expo-file-system"
import { TaggedListMedia, TagShortcut, TagManagement } from "./media"
import { PlaySound, Recognizer, Recorder } from "../components"
import { TaggedTranscript } from "./tagged-transcript"
import { useDispatch } from "react-redux"


export default class AudioBook extends TaggedListMedia {
    static defaultProps = {
        ...super.defaultProps,
        id: "audiobook",
        slug: "audiobook",
        title: "Record audio as practice material",
        thumb: require("../../assets/widget-audio-book.jpeg"),
        description: "A list of audios: manage audio book with tags and practise them",
        tags:["Vocabulary","Speak","Grammar", "Talk"],
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

    static Shortcut=()=><TagShortcut slug={AudioBook.defaultProps.slug}/>

    static TagManagement=props=><TagManagement talk={this.defaultProps} placeholder="Tag: to categorize your audio book" {...props}/>
    static TaggedTranscript=({slug="audiobook"})=>{
        const dispatch=useDispatch()
        return (
            <TaggedTranscript slug={slug}
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
