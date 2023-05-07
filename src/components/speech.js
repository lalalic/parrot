import tts from "react-native-tts"
export  async function speak(text, {onStart, onDone, onCancel, ...options}={}){
        let a, b, c
        try{
            return new Promise((resolve, reject)=>{
                (async()=>{
                    a=tts.addEventListener('tts-start',({utteranceId:id})=>{
                        if(id==utterance){
                            onStart?.()
                            a.remove()
                        }
                    })
                    b=tts.addEventListener('tts-finish',({utteranceId:id})=>{
                        if(id==utterance){
                            onDone?.()
                            b.remove()
                            resolve()
                        }
                    })
                    c=tts.addEventListener('tts-cancel',({utteranceId:id})=>{
                        if(id==utterance){
                            onCancel?.(id)
                            c.remove()
                            resolve()
                        }
                    })
                    const utterance=await tts.speak(text,options)
                })();
            })
        }catch(e){
            console.error(e)
            a && a.remove();
            b && b.remove();
            c && c.remove();
        }
}

export function stop(){
    tts.stop()
}

export function setIgnoreSilentSwitch(){
    tts.setIgnoreSilentSwitch("ignore")
}

export function setDefaults({lang, voice}){
    lang && tts.setDefaultLanguage(lang)
    voice && tts.setDefaultVoice(voice)
}