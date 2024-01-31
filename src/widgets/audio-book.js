import React from "react"
import * as FileSystem from "expo-file-system"
import { View, Linking, Text} from "react-native" 
import { TaggedListMedia,  } from "./media"
import { PlaySound, Recorder } from "../components"
import PressableIcon from "react-native-use-qili/components/PressableIcon"
import ChangableText from "react-native-use-qili/components/ChangableText"
import { TaggedTranscript } from "./tagged-transcript"
import { ColorScheme } from "react-native-use-qili/components/default-style"
import { useDispatch, useSelector } from "react-redux"
import * as DocumentPicker from 'expo-document-picker'

/**
 * data:[{text}]
 */
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
        return (
            <>
                <Text style={{color:"yellow"}}>{text}</Text>
                {this.speak({rate,volume,text:uri ? {audio:uri} : text})}
            </>
        )
    }

    static removeSave=false

    static TaggedTranscript=({id, ...props})=>{
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
            <TaggedTranscript {...props} id={id}
                renderItem={AudioItem}
                actions={[
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
        {label:"Article", name:"article",
            speakable:false,
            params:{
                "Target":"a short self-introduction",
                "Role":"a customer communication management software architect",
                "Scene":"interview"
            }, 
            prompt:(a,store)=>{
                const {lang}=store.getState().my
                return ` Please make ${a.Target} in language of locale ${lang} for Ray, 
                as ${a.Role}, for ${a.Scene}. 
                your response should only include the introduction with a few paragraphs.
                    `
            },
            onSuccess({response, store}){
                const {Role, Target}=this.params
                const {lang}=store.getState().my
                const title=`${Target} for ${Role}`
                const data=response.split(/[\n]/g).filter(a=>!!a).map(text=>({text}))
                const id=AudioBook.create({title, data, generator:"Article",params:this.params,lang }, store.dispatch)
                return `save to @#${id}`
            }
        }
    ]

    static onFavorite=null
}