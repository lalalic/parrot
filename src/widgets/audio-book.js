import React from "react"
import * as FileSystem from "expo-file-system"
import { View, TextInput,  } from "react-native" 
import { TaggedListMedia,  } from "./media"
import { PlaySound, PressableIcon, Recorder } from "../components"
import { TaggedTranscript } from "./tagged-transcript"
import { ColorScheme } from "../components/default-style"
import { useDispatch } from "react-redux"
import * as DocumentPicker from 'expo-document-picker'

export default class AudioBook extends TaggedListMedia {
    static defaultProps = {
        ...super.defaultProps,
        cueHasDuration:true,
        id: "audiobook",
        slug: "audiobook",
        title: "Audio Book",
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

    static TaggedTranscript=({slug=AudioBook.defaultProps.slug})=>{
        const dispatch=useDispatch()
        const color=React.useContext(ColorScheme)
            
        const AudioItem=React.useCallback(({item:{text, uri}})=>{
            const [playing, setPlaying] = React.useState(false)
            return (
                <View
                    style={{ flexDirection: "row", height: 50 }}>
                    <PressableIcon name={!!uri ? (playing ? "pause-circle-outline" : "play-circle-outline") : "radio-button-unchecked"} 
                        onPress={e=>uri && setPlaying(!playing)}
                        onLongPress={e=>dispatch({type:`${slug}/remove`, uri})}
                        />
                    <View style={{ justifyContent: "center", marginLeft: 10, flexGrow: 1, flex: 1 }}>
                        <TextInput style={{color: playing ? color.primary : color.text}} defaultValue={text} 
                            onEndEditing={({nativeEvent:e})=>{
                                if(text!=e.text){
                                    dispatch({type:`${slug}/set`,text:e.text,uri})
                                }
                            }}/>
                        {playing && <PlaySound audio={uri} onEnd={e=>setPlaying(false)}/>}
                    </View>
                </View>
            )
        },[])
        return (
            <TaggedTranscript slug={slug}
                renderItem={AudioItem}
                actions={tag=>[
                    <PressableIcon name="file-upload" key="file"
                        onPress={e=>DocumentPicker.getDocumentAsync({type:"audio/*",multiple:true}).then((res,files)=>{
                            if(res.type=="cancel")
                                return
                            files.forEach(file=>{
                                this.create({uri:file.uri, tag, text:"placeholder"},dispatch)
                            })
                        })}/>,
                    <Recorder key="recorder"
                        onRecordUri={()=>`${FileSystem.documentDirectory}audiobook/${Date.now()}.wav`}
                        onRecord={({audio:uri, recognized:text, ...record})=>text && dispatch({type:"audiobook/record",uri,text, tags:[tag],...record})}
                        />,
                    
                ]}
            />
        )
    }

    static prompts=[
        
    ]
}