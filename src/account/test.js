import React from "react"
import { Text , AppState} from "react-native"
import { useAssets} from "expo-asset"

import { TrainPlayer } from "tts"

export default function TestTrainPlayer({}){
    React.useEffect(()=>{
        TrainPlayer.playItems(["hello world", "play sound for me today", "good morning for today and tomorrow"])
    },[])

    return <Text>playing...</Text>
}

/*
import { PlaySound, Speak } from "../components"
export default function TestBackground({}){
    const [[musicAsset]=[]]=useAssets([require("../../assets/sample.mp3")])
    const [a, setA]=React.useState()
    const music=React.useRef(0)
    React.useEffect(()=>{
        setInterval(e=>{
            Speak.speak((music.current++)+"")
        }, 3000)
    },[])

    const appState=React.useRef(AppState.currentState)
    const musicRef=React.useRef(music)
    musicRef.current=music
    React.useEffect(()=>{
        const subscription=AppState.addEventListener('change',next=>{
            if(next.match(/inactive|background/) && appState.current === 'active'){
                appState.current='background'
                setInterval(e=>{
                    Speak.speak(i++)
                }, 3000)
            }else if(next === 'active' && appState.current.match(/inactive|background/)){
                appState.current='active'
            }
        })
        return ()=>{
            subscription?.remove()
        }
    },[])
    if(music.current){
        return <Text>Playing...</Text>
        return <Speak text={music.current+""} key={music.current}/>
    }
    return <Text>loading....</Text>
}
*/

/*
import Voice from "@react-native-voice/voice"
export  default function TestVoice({style, uri, locale="en-US", ...props}){
    const [recognized, setRecognizedText]=React.useState("...")
    React.useEffect(()=>{
        let recognized4Cleanup, start, end
        Voice.onSpeechResults=e=>{
            setRecognizedText(recognized4Cleanup=e?.value.join(""))
        }
        Voice.onSpeechStart=e=>{
            console.debug("onSpeechStart")
            start=Date.now()
        }
        Voice.onSpeechEnd=e=>{
            console.debug("onSpeechEnd")
            end=Date.now()
        }
        
        Voice.onSpeechError=e=>{
            console.error(e)
        }
        const audioUri=uri?.replace("file://","")
        ;(async()=>{
            if(audioUri){
                const folder=uri.substring(0,uri.lastIndexOf("/")+1)
                const info=await FileSystem.getInfoAsync(folder)
                if(!info.exists){
                    await FileSystem.makeDirectoryAsync(folder,{intermediates:true})
                }
            }
            Voice.start(locale,{audioUri})  
        })();

        const submit=()=>{
            onRecord?.({
                recognized:recognized4Cleanup, 
                uri:`file://${audioUri}`, 
                duration:(end||Date.now())-start
            })
        }

        return async ()=>{
            try{
                await Voice.stop()
                await Voice.destroy()
                if(recognized4Cleanup){
                    submit() 
                }else{
                    onRecord?.({})
                }
            }finally{
                
            }
        }
    },[])

    return (
        <Text style={{color:"white", ...style}} {...props}>
            {recognized}
        </Text>
    )
}
*/


/*
import { CoreMLImage } from "../../tts"
export default function TestCoreMLImage({}){
    const [[modelAsset]=[]]=useAssets([require("../../assets/models/image.mlmodelc")])
    const [objects, setObjects]=React.useState([])
    const [model, setModel]=React.useState()
    React.useEffect(()=>{
        if(modelAsset){
            (async()=>{
                await modelAsset.downloadAsync()
                setModel(modelAsset.localUri.substring("file://".length))
            })()
        }
    },[modelAsset])
    if(!model)
        return <Text style={{color:"white"}}>loading....</Text>
    return (
        <CoreMLImage style={{flex:1}}
            modelFile={model} 
            onClassification={e=>{
                setObjects(e.nativeEvent.classifications)
            }}/>
    )
}
*/