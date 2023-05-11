import React from "react"
import { Text } from "react-native"
import Voice from "@react-native-voice/voice"

export default ({style, uri, locale="en-US", ...props})=>{
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