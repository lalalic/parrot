import React from "react"
import * as tf from '@tensorflow/tfjs';
import {fetch, decodeJpeg, cameraWithTensors} from '@tensorflow/tfjs-react-native';
import { Text , Image, View} from "react-native";
import {Camera} from "expo-camera"
import Speech from "@tensorflow-models/speech-commands"


export function TTS(){
    const [tfReady, setTFReady]=React.useState(false)
    const [predictions, setPredictions]=React.useState()
    React.useEffect(()=>{
        (async ()=>{
            if(__DEV__)
                tf.setBackend('cpu')
            await tf.ready()
            setTFReady(true)
            async function detectObject(){
                try{
                    const image=Image.resolveAssetSource(require("../../assets/widget-audio-book.jpeg"))
                    const url="https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v1_025_128/classification/1/default/1"
                    const response=await fetch(image.uri, {}, {isBinary:true})
                    const rawImageData=new Uint8Array(await response.arrayBuffer())
                    const imageData=decodeJpeg(rawImageData)
                    const imageTensor = tf.cast(tf.image.resizeBilinear(imageData, [128, 128]), 'float32')
                    const model=await tf.loadGraphModel(url, { fromTFHub: true })
                    const predictions = await model.predict(tf.tensor4d(Array.from(imageTensor.dataSync()),[1,128,128,3]))
                    setPredictions(predictions)
                }catch(e){
                    console.error(e)
                }
            }

            async function tts(){
                const model=await Speech.load()
                const audio = await model.synthesize("hello world");

            }
        })();
    },[])
    return (<>
        <Text style={{color:"red", marginTop:50}}>Hello: TensorFlow is {!tfReady && "not"} ready</Text>
        
        <Text style={{color:"red"}}>
            {JSON.stringify(predictions ?? {})}
        </Text>

        <Image source={image} style={{marginTop:20}}/>
        
    </>)
}


export const MyCamera=(()=>{
    const TensorCamera=cameraWithTensors(Camera)
    return ()=>(
        <View style={{flex:1}}>
            <TensorCamera
                // Standard Camera props
                style={{flex:1}}
                type={Camera.Constants.Type.front}
                // Tensor related props
                resizeHeight={200}
                resizeWidth={152}
                resizeDepth={3}
                onReady={(images, updatePreview, gl)=>{
                    const loop = async () => {
                        const nextImageTensor = images.next().value
                 
                        //
                        // do something with tensor here
                        //
                 
                        // if autorender is false you need the following two lines.
                        // updatePreview();
                        // gl.endFrameEXP();
                 
                        requestAnimationFrame(loop);
                      }
                      loop();
                }}
                autorender={true}
                />
        </View>
    )
})();