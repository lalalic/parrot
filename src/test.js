import React from "react"
import {View, Text, Button} from "react-native"
import Voice from "@react-native-voice/voice"

export default ()=>{
    const [results, setResults]=React.useState([])
    const [audio, setAudio]=React.useState(null)
    const [sound, setSound]=React.useState(null)

    const play=async ()=>{
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync({uri:audio})
        setSound(sound)
        await sound.playAsync();
    }
    React.useEffect(()=>{
        Voice.onSpeechResults=({value})=>{
            console.log("onSpeechResults")
            setResults(value)
        }
        Voice.onSpeechStart=e=>{
            console.log("onSpeechStart")
            setAudio(e?.audioUri)
            console.log(e)
        }
        
        Voice.onSpeechEnd=e=>{
            console.log("onSpeechEnd")
            console.log(e)
        }
        Voice.onSpeechError=e=>{
            console.log("onSpeechError")
            console.log(e)
        }
        Voice.onSpeechRecognized=e=>{
            console.log("onSpeechRecognized")
            console.log(e)
        }
        return ()=>{
            Voice.destroy();
            sound?.unloadAsync()
        }
    },[])

    const [started, setStarted]=React.useState(false)
    return (
        <View style={{}}>
            <Button title={started ? "stop":"start"} 
                    onPress={e=>{
                        if(started){
                            Voice.stop()
                        }else {
                            setStarted(true)
                            Voice.start('en-US')}
                        }
                    }/>
            <Text>results:{results.join("")}</Text>
            <Butt title="play" onPress={play}/>
        </View>
    )
}