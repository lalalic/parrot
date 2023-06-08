import React from "react"
import { NativeModules, Text , Image, View} from "react-native"
import { useAssets} from "expo-asset"
import {PlaySound} from "../components"
import processText from "./tts-preprocess"

const TensorFlowLiteTTS = NativeModules.TensorFlowLiteTTSBridge;

export default function TTS(){
    const [audio, setAudio]=React.useState("")
    const [[tts, melgan]=[]]=useAssets([
        require('../../assets/models/fastspeech2_quant.tflite'),
        require('../../assets/models/mb_melgan_quant.tflite')
    ])
    React.useEffect(()=>{
        if(tts && melgan){
            (async ()=>{
                await tts.downloadAsync()
                await melgan.downloadAsync()
                const ids=processText("")
                console.info(ids)
                const input_ids=btoa(String.fromCharCode(...ids))
                const audio=await TensorFlowLiteTTS.generateSpeech(
                    input_ids, 
                    tts.localUri.replace("file://",""),
                    melgan.localUri.replace("file://","")
                )
                console.info({audio})
                setAudio(audio)
            })();
        }
    
    },[tts, melgan])
    
    return (
        <>
            <Text style={{color:"red"}}>{audio.length}</Text>
            {audio && <PlaySound audio={audio} onEnd={()=>setAudio("")}/>}
        </>
    )
}
