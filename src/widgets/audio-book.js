import React from "react"
import * as FileSystem from "expo-file-system"
import { View, Linking, Text, Pressable} from "react-native" 
import { TaggedListMedia,  } from "./media"
import Recorder from "../components/Recorder"
import Speak from "../components/Speak"
import PlaySound from "../components/PlaySound"
import Delay from "../components/delay"
import PressableIcon from "react-native-use-qili/components/PressableIcon"
import { TaggedTranscript, clean, getItemText } from "./management/tagged-transcript"
import { ColorScheme } from "react-native-use-qili/components/default-style"
import prepareFolder from "react-native-use-qili/components/prepareFolder"
import { ask } from "react-native-use-qili/components/predict"
import {alert} from "react-native-use-qili/components/Prompt"

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

    renderAt(cue){ 
        const {rate, volume}=this.status
        const {policy, whitespacing}=this.props
        const {text, pronunciation="", uri,fulltext}=cue
        
        const title= policy.fullscreen ? fulltext : pronunciation

        return (
            <>
                <Text style={{padding:10, color:"white", textAlign:"center", fontSize:20}}>
                    {!!whitespacing && !!policy.caption && <Delay seconds={policy.captionDelay}>{title}</Delay>}
                </Text>
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
        const onLongPress=React.useCallback(async ({item,index:i, id})=>{
            switch(lang){
                case "en":
                    return Linking.openURL(`https://youglish.com/pronounce/${encodeURIComponent(item.text)}/english?`)
                default:{
                    if(await alert(l10n["Do you want to create audio for this item?"])){
                        await createAudio({item, id, i, dispatch})
                    }
                }      
            }
        },[lang])

        const AudioItem=React.useCallback(({item, text=item.text, uri=item.uri, id, index, isActive, setActive})=>{
            const [playing, setPlaying] = React.useState(false)
            const textStyle={color: playing ? color.primary : color.text}
            
            return (
                <View style={{ flexDirection: "row", height: 70, backgroundColor: isActive ? 'skyblue' : 'transparent', borderRadius:5, }}>
                    <PressableIcon color={!!uri ? "white" : undefined}
                        name={playing ? "pause-circle-outline" : "play-circle-outline"} 
                        onPress={e=>setPlaying(!playing)}
                        onLongPress={e=>onLongPress?.({item, index, id})}
                        emphasizer={
                            <View pointerEvent="none"  style={{position:"absolute", height:"100%",width:5, right:0,top:3,flexDirection:"column", justifyContent:"center"}}>
                                <View style={{width:5,height:5,backgroundColor:"red", borderRadius:5}}/>
                            </View>
                        }
                        />
                    <Pressable 
                        onPress={e=>setActive(isActive ? -1 : index)}
                        style={{ justifyContent: "center", marginLeft: 10, flexGrow: 1, flex: 1 }}>
                        <Text style={textStyle}>{React.useMemo(()=>getItemText(item,true),[item])}</Text>
                        {playing && (uri ? <PlaySound audio={uri} onEnd={e=>setPlaying(false)}/> : <Speak text={text} onEnd={e=>setPlaying(false)}/>)}
                    </Pressable>
                    <PressableIcon name="remove-circle-outline" 
                        onPress={e=>dispatch({type:"talk/book/remove/index", index, id})}/>
                </View>
            )
        },[])
        return (
            <TaggedTranscript {...props} id={id}
                renderItem={AudioItem}
                actions={
                    <>
                    <Recorder
                        onRecordUri={()=>`${FileSystem.documentDirectory}${id}/audio/${Date.now()}.wav`}
                        onRecord={({audio:uri, recognized:text, ...record})=>{
                            if(text){
                                dispatch({type:"talk/book/record",id, uri,text, ...record})
                            }
                        }}
                        />
                    <PressableIcon name="file-upload"
                        onPress={e=>DocumentPicker.getDocumentAsync({type:"audio/*",copyToCacheDirectory:false}).then(file=>{
                            if(file.type=="cancel")
                                return
                            dispatch({type:"talk/book/record", id, uri:file.uri, text:file.name})
                        })}/>
                    </>}
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
    static parse(input){
        return input.split(/[\r\n]/g).filter(a=>!!a)
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

    static prompts=[
        {label:"Article", name:"article",
            speakable:false,
            params:{
                instruction:"a short self-introduction",
                sentences: "5",
                audio: false,
            }, 
            prompt:(a,store)=>{
                const {lang, mylang}=store.getState().my
                return `${a.instruction}
                    -----
                    Response should use ${lang} language.
                    Response should NOT have anything else. 
                    Response should have at least ${a.sentences} sentences.
                    Each sentence should have [pronunciation] at end, then (translation).
                    Pronunciation should use International Phonetic Alphabets. 
                    Translation target language should be ${mylang}.
                    Translation should NOT have prounciation.
                    Each sentence should be in a line alone.  
                `
            },
            async onSuccess({response, ask, store}){
                const {instruction, audio}=this.params
                const {lang}=store.getState().my
                const title=instruction
                const data=AudioBook.parse(response)
                const id=AudioBook.create({title, data, generator:"Article",params:this.params,lang }, store.dispatch)
                if(audio){
                    const dispatch=store.dispatch
                    await Promise.all(
                        data.map(async (item, i)=>{
                            try{
                                await createAudio({ask, item, id, i, dispatch})
                            }catch(e){
                                console.error(e.message)
                            }
                        })
                    )
                }
                return `save to @#${id}`
            }
        }
    ]

    static makeAudio(text){
        
    }

    static onFavorite=null
}

async function createAudio({item, id, i, dispatch}) {
    const response = await ask({
        question:item.text,
        overrideConfig:{
            functionCall:"tts"
        }
    },"agent")
    const url = response.split("#audio?url=")[1].replace(")", "")
    if (url) {
        const uri = `${FileSystem.documentDirectory}${id}/audio/${i}.mp3`
        await prepareFolder(uri)
        await FileSystem.downloadAsync(url, uri)
        dispatch({ type: "talk/book/replace", id, i, appending: [{ ...item, uri }] })
    }
}

