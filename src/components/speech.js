import tts from "react-native-tts"
export  function speak(text, {onStart, onDone, onCancel, ...options}={}){
        let a, b, c
        try{
            tts.stop()
            a=tts.addEventListener('tts-start',e=>{
                onStart?.(e)
                a.remove()
            })
            b=tts.addEventListener('tts-finish',e=>{
                onDone?.(e)
                b.remove()
            })
            c=tts.addEventListener('tts-cancel',e=>{
                onCancel?.(e)
                c.remove()
            })
            tts.speak(text,options)
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