import * as FileSystem from "expo-file-system"
import { TaggedListMedia, TagShortcut, TagManagement } from "./media"
import { PlaySound, PressableIcon, Recognizer, Recorder } from "../components"
import { TaggedTranscript } from "./tagged-transcript"
import { useDispatch } from "react-redux"
import * as DocumentPicker from 'expo-document-picker'



export default class AudioBook extends TaggedListMedia {
    static defaultProps = {
        ...super.defaultProps,
        cueHasDuration:true,
        id: "audiobook",
        slug: "audiobook",
        title: "Record audio as practice material",
        thumb: require("../../assets/widget-audio-book.jpeg"),
        description: "A list of audios: manage audio book with tags and practise them",
        tags:["Vocabulary","Speak","Grammar", "Talk"],
    }

    renderAt({text, uri}, i){ 
        const {rate, volume}=this.status
        return (
            <PlaySound {...{key:i, audio:uri, rate, volume}}/>
        )
    }

    static Shortcut=()=><TagShortcut slug={AudioBook.defaultProps.slug}/>
    static TagManagement=props=><TagManagement talk={AudioBook.defaultProps} placeholder="Tag: to categorize your audio book" {...props}/>
    static TaggedTranscript=({slug=AudioBook.defaultProps.slug})=>{
        const dispatch=useDispatch()
        return (
            <TaggedTranscript slug={slug}
                audioUri={item=>item.uri}
                actions={tag=>[
                    <PressableIcon name="file-upload"
                        onPress={e=>DocumentPicker.getDocumentAsync({type:"audio/*",multiple:true}).then((res,files)=>{
                            if(res.type=="cancel")
                                return
                            files.forEach(file=>{
                                create({uri:file.uri, tag, text:"placeholder"},dispatch)
                            })
                        })}/>,
                    <Recorder
                        onRecordUri={()=>`${FileSystem.documentDirectory}audiobook/${Date.now()}.wav`}
                        onRecord={({audio:uri, recognized:text, ...record})=>text && create({uri,text, tags:[tag],...record},dispatch)}
                        />,
                    
                ]}
                onTextChange={(uri, text)=>dispatch({type:"audiobook/set",uri,text})}
            />
        )
    }

    static prompts=[
        {name:"sports-kabaddi", label:"sport", 
            params:{type:"kitchen"},
            prompt:({type})=>`you are english tuitor, please give some words about ${type}`},
        {name:"post-add", label:"dialog",
            prompt:"give some numbers for me to practise english numbers"}
    ]
}

function create(talk, dispatch){
    dispatch({type:"audiobook/record", id:talk.id, talk:{...AudioBook.defaultProps, ...talk}})
}
