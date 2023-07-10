import React from "react"



//Diffusion service
import { View, TextInput, Image } from "react-native"
import PressableIcon from "react-native-use-qili/components/PressableIcon"
import services from "../../components/webview-services"
const {diffusion:{Provider, useService:useDiffusion}} = services

export default function HuggingFace(){
    return (
        <Provider debug={true} banned={false}>
            <Diffussion/>
        </Provider>
    )
}

function Diffussion(){
    const refInput=React.useRef()
    const {service}=useDiffusion()
    const [prompt, setPrompt]=React.useState("")
    const [images, setImages]=React.useState([])
    const imageStyle={width:150, height:150, padding:10, backgroundColor:"white", marginBottom:20}
    return (
        <View style={{flex:1, alignItems:"center"}}>
            <View style={{height:100, marginTop:50,marginBottom:50, flexDirection:"row", justifyContent:"center"}}>
                <TextInput ref={refInput} value={prompt}
                    multiline={true}
                    style={{padding:5, flexGrow:1, border:1, backgroundColor:"gray"}}
                    onChangeText={text=>setPrompt(text)}
                    />
                <View style={{width:100, justifyContent:"center"}}>
                    <PressableIcon name="brunch-dining" 
                        onPress={e=>{
                            if(prompt){
                                return service.generate(prompt).then(setImages)
                            }
                        }}
                        />
                </View>
            </View>
            <View style={{
                flexGrow:1, 
                flexDirection:"row", flexWrap:'wrap', 
                alignContent:"flex-start",
                justifyContent:"space-around"}}>
                {images.map((uri,i)=><Image key={i} source={{uri}} style={imageStyle}/>)}
            </View>
        </View>
    )
}

/*
import { Text , AppState, View, Button, Alert} from "react-native"
import Select from "react-native-select-dropdown"
import PressableIcon from "react-native-use-qili/components/PressableIcon"
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
export default function Test(){
    const refSelector=React.useRef()
    return (
        <View style={{flex:1, padding:50,backgroundColor:"white", alignItems:"flex-end"}}>
            <Select ref={refSelector}
                buttonStyle={{ backgroundColor:"transparent", width:50,height:50}}
                defaultButtonText="Search"
                //dropdownStyle={{width:100,marginRight:5}}
                searchInputStyle={{width:100,padding:10}}
                renderCustomizedButtonChild={(value)=><MaterialIcons name="more"/>}
                search={true}
                data={["hello","world"]}
                />
        </View>
    )
}

*/

/*
import { TrainPlayer } from "tts"
import * as Clipboard from "expo-clipboard"
function TestTrainPlayer({}){
    React.useEffect(()=>{
        Clipboard.setUrlAsync("https://www.youtube.com/watch?v=lUUte2o2Sn8")
    },[])
    React.useEffect(()=>{
        const {uri}=Image.resolveAssetSource(require("../../assets/sample.mp3"))
        const items=[uri,...new Array(10).fill("good morning for today and tomorrow")]
        TrainPlayer.playItems(items)
        return ()=>TrainPlayer.stop()
    },[])
    return <Text>playing...</Text>
}

*/

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