import React from "react"
import { Audio } from 'expo-av'


function useSound(audio){
    const [sound, setSound]=React.useState()
    React.useEffect(()=>{
        Audio.Sound.createAsync(audio).then(({sound})=>setSound(sound))
        return ()=>sound?.unloadAsync()
    },[])
    return React.useCallback(async ()=>{
        await sound?.setPositionAsync(0)
        await sound?.playAsync()
    },[sound])
}

globalThis.sounds={}
export default function PreloadSound({ding, pop, celebrate}){
    globalThis.sounds.ding=useSound(ding)
    globalThis.sounds.pop=useSound(pop)
    globalThis.sounds.celebrate=useSound(celebrate)
    return null
}

