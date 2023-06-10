import React from "react"
import * as FileSystem from "expo-file-system"
import { View, Linking, Pressable, Text } from "react-native" 
import { TaggedListMedia,  } from "./media"
import { ChangableText, PlaySound, PressableIcon, Recorder } from "../components"
import { TaggedTranscript } from "./tagged-transcript"
import { ColorScheme } from "../components/default-style"
import { useDispatch, useSelector } from "react-redux"
import * as DocumentPicker from 'expo-document-picker'

export default class AudioBook extends TaggedListMedia {
    static defaultProps = {
        ...super.defaultProps,
        id: "audiobook",
        slug: "audiobook",
        title: "Audio Book",
        thumb: require("../../assets/widget-audio-book.jpeg"),
        description: "A list of audios: manage audio book with tags and practise them",
    }

    renderAt({text, uri}, i){ 
        const {rate, volume}=this.status
        return this.speak({rate,volume,text:{audio:uri}})
    }

    static removeSave=false

    static TaggedTranscript=({slug=AudioBook.defaultProps.slug})=>{
        const dispatch=useDispatch()
        const color=React.useContext(ColorScheme)
        const {lang="en"}=useSelector(state=>state.my)
            
        const AudioItem=React.useCallback(({item:{text, uri}, id})=>{
            const [playing, setPlaying] = React.useState(false)
            return (
                <View style={{ flexDirection: "row", height: 50 }}>
                    <PressableIcon name={!!uri ? (playing ? "pause-circle-outline" : "play-circle-outline") : "radio-button-unchecked"} 
                        onPress={e=>uri && setPlaying(!playing)}
                        onLongPress={e=>dispatch({type:`talk/book/remove`, id, uri})}
                        />
                    <ChangableText 
                        onPress={e=>lang=="en" && Linking.openURL(`https://youglish.com/pronounce/${encodeURIComponent(text)}/english?`)}
                        onChange={value=>dispatch({type:`talk/book/set`,id, uri, text:value})}
                        text={{style:{color: playing ? color.primary : color.text}, value:text}}
                        style={{ justifyContent: "center", marginLeft: 10, flexGrow: 1, flex: 1 }}>
                        {playing && <PlaySound audio={uri} onEnd={e=>setPlaying(false)}/>}
                    </ChangableText>
                </View>
            )
        },[])
        return (
            <TaggedTranscript slug={slug}
                renderItem={AudioItem}
                actions={(tag,id)=>[
                    <PressableIcon name="file-upload" key="file"
                        onPress={e=>DocumentPicker.getDocumentAsync({type:"audio/*",copyToCacheDirectory:false}).then(file=>{
                            if(file.type=="cancel")
                                return
                            dispatch({type:"talk/book/record", id, uri:file.uri, text:file.name})
                        })}/>,
                    <Recorder key="recorder"
                        onRecordUri={()=>`${FileSystem.documentDirectory}audiobook/${Date.now()}.wav`}
                        onRecord={({audio:uri, recognized:text, ...record})=>text && dispatch({type:"talk/book/record",id, uri,text, ...record})}
                        />,
                    
                ]}
            />
        )
    }

    static prompts=[
        
    ]
}