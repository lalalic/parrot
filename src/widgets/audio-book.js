import React from "react"
import * as FileSystem from "expo-file-system"
import { View, Linking, Text, Pressable} from "react-native" 
import { TaggedListMedia,  } from "./media"
import { PlaySound, Recorder } from "../components"
import PressableIcon from "react-native-use-qili/components/PressableIcon"
import { TaggedTranscript, clean, getItemText } from "./management/tagged-transcript"
import { ColorScheme } from "react-native-use-qili/components/default-style"
import { useDispatch, useSelector } from "react-redux"
import * as DocumentPicker from 'expo-document-picker'

/**
 * data:[{text, pronunciation, translated}]
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

    renderAt({text, uri}, ){ 
        const {rate, volume}=this.status
        return (
            <>
                {this.speak({rate,volume,text:uri ? {audio:uri} : text})}
            </>
        )
    }

    static parse(input){
        return input.split(/[\n;]/).filter(a=>!!a)
            .map(a=>{
                let pronunciation, translated;
                a=a.replace(/\[(?<pronunciation>.*)\]/,(a,p1)=>{
                    pronunciation=p1.trim()
                    return ""
                }).trim();
                a=a.replace(/[\(（](?<translated>.*)[\)）]/,(a,p1)=>{
                    translated=p1.trim()
                    return ""
                }).trim()
                if(a){
                    return clean({text:a, pronunciation, translated})
                }
            }).filter(a=>!!a)
    }

    static removeSave=false

    static TaggedTranscript=({id, ...props})=>{
        const dispatch=useDispatch()
        const color=React.useContext(ColorScheme)
        const {lang="en"}=useSelector(state=>state.my)
            
        const AudioItem=React.useCallback(({item, text=item.text, uri=item.uri, id, index, isActive, setActive})=>{
            const [playing, setPlaying] = React.useState(false)
            const textStyle={color: playing ? color.primary : color.text}

            return (
                <View style={{ flexDirection: "row", height: 70, backgroundColor: isActive ? 'skyblue' : 'transparent', borderRadius:5, }}>
                    <PressableIcon name={!!uri ? (playing ? "pause-circle-outline" : "play-circle-outline") : "radio-button-unchecked"} 
                        onPress={e=>uri && setPlaying(!playing)}
                        onLongPress={e=>dispatch({type:`talk/book/remove`, id, uri})}
                        />
                    <Pressable 
                        onPress={e=>setActive(isActive ? -1 : index)}
                        onLongPress={e=>lang=="en" && Linking.openURL(`https://youglish.com/pronounce/${encodeURIComponent(text)}/english?`)}
                        style={{ justifyContent: "center", marginLeft: 10, flexGrow: 1, flex: 1 }}>
                        <Text style={textStyle}>{React.useMemo(()=>getItemText(item),[item])}</Text>
                        {playing && <PlaySound audio={uri} onEnd={e=>setPlaying(false)}/>}
                    </Pressable>
                    <PressableIcon name="remove-circle-outline" 
                        onPress={e=>dispatch({type:"talk/book/remove/index", index, id})}/>
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
                editor={{
                    onChange(text, i, {uri}){
                        const [item]=AudioBook.parse(text)
                        dispatch({type:"talk/book/set", id, uri, ...item})
                    },
                    getItemText,
                    multiline:true,
                    editingStyle: {height:70},
                    onChangeText(text){
                        return text.replace(/[\r\n]/g,'')
                    }
                }}
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
                return ` Make ${a.Target} in ${lang} language for Ray,  as ${a.Role}, for scenario: ${a.Scene}.
                ---
                Response should NOT have anything else.
                `
            },
            onSuccess({response, store}){
                const {Role, Target}=this.params
                const {lang}=store.getState().my
                const title=`${Target} for ${Role}`
                const data=response.split(/[\r\n]/g).map(a=>a.trim()).filter(a=>!!a).map(text=>({text}))
                const id=AudioBook.create({title, data, generator:"Article",params:this.params,lang }, store.dispatch)
                return `save to @#${id}`
            }
        }
    ]

    static onFavorite=null
}