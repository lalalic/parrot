import React from "react"
import * as tf from '@tensorflow/tfjs';
import {bundleResourceIO, } from '@tensorflow/tfjs-react-native';
import { Text } from "react-native";


export default function TTS(){
    const [tfReady, setTFReady]=React.useState(false)
    const [model, setModel]=React.useState()
    React.useEffect(()=>{
        (async ()=>{
            await tf.ready()
            setTFReady(true)
            try{
                const config=require("../../assets/hifigan_dr.json")
                const modelData=require("../../assets/hifigan_dr.bin")
                const bundle=bundleResourceIO(config, modelData)
                const model=await tf.loadLayersModel(bundle)
                setModel(model)
            }catch(e){
                console.error(e)
            }
        })();
    },[])
    return (<>
        <Text style={{color:"red", marginTop:50}}>Hello: TensorFlow is {!tfReady && "not"} ready</Text>
        <Text style={{color:"red"}}>
            {JSON.stringify(model ?? {})}
        </Text>
    </>)
}