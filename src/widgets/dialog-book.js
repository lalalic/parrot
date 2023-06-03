import React from "react"
import { TaggedListMedia } from "./media"
import { PressableIcon } from "../components"
import { TaggedTranscript } from "./tagged-transcript"
import * as Clipboard from "expo-clipboard"
import { useDispatch } from "react-redux"

//[{ask, text:answer}]
export default class DialogBook extends TaggedListMedia{
    static defaultProps={
        ...super.defaultProps,
        id:"dialog",
        slug:"dialog",
        description:"Dialog Practice",
        title: "Dialog Book",
        thumb: require("../../assets/widget-dialog-book.png")
    }

    static prompts=[
        {label:"Role Play", name:"post-add",
            params:{
                "Your Role":"Software Engineering Manager",
                "Your Name":"Bob",
                "My Role":"Software Engineer",
                "My Name":"Ray",
                "Scene":"We are discussing a solution for a message queue",
            }, 
            prompt:a=>`Let's role-play. 
                Your role is ${a["Your Role"]}, and your name is ${a["Your Name"]}. 
                My role is ${a["My Role"]}, and my name is ${a["My Name"]}.
                the scene: ${a["Scene"]}.
                You must wait for my response before you continue.  
                ${a["Your Name"]}:`,
            settings:{
                dialog:true
            }
        },
        {label:"Create Dialog", name:"post-add",
            params:{
                "Your Role":"Software Engineering Manager",
                "My Role":"Software Engineer",
                "Scene":"We are discussing a solution for a message queue",
            }, 
            prompt:a=>` 
                Your role is ${a["Your Role"]}. 
                My role is ${a["My Role"]}.
                the scene: ${a["Scene"]}.
                Please make a dialog for me to practise english. 
                `,
            onSuccess({response, dispatch}){
                const {Scene:title}=this.params
                const data=DialogBook.parse(response)
                const id=DialogBook.create({title, data }, dispatch)
                return `save to @#${id}`
            }
        },
    ]

    renderAt({ask},i){
        return this.speak({text:ask})
    }

    static TaggedTranscript({}){
        const color=React.useContext(ColorScheme)
        
        const Item=React.useCallback(({item:{text:lang, mylang=""}, id, index})=>{
            const [playing, setPlaying] = React.useState(false)
            const textStyle={color: playing ? color.primary : color.text}
            const text=`${lang} : ${mylang}`
            return (
                <View style={{ flexDirection: "row", height: 50 }}>
                    <PressableIcon name={playing ? "pause-circle-outline" : "play-circle-outline"} 
                        onPress={e=>setPlaying(!playing)}/>
                    <Pressable 
                        onLongPress={e=>setEditing(true)}
                        style={{ justifyContent: "center", marginLeft: 10, flexGrow: 1, flex: 1 }}>
                            <Text style={textStyle}>{text}</Text>
                            {playing && <Speak text={lang} onEnd={e=>setPlaying(false)}/>}
                    </Pressable>
                </View>
            )
        },[])

        return (
            <TaggedTranscript 
                slug={DialogBook.defaultProps.slug}
                actions={(title,id)=><Paste id={id}/>}
                listProps={{
                    renderItem:Item,
                    keyExtractor:a=>a.ask
                }}
                />
        )
    }

    static parse(text){
        return text.split("\n").filter(a=>!!a)
            .map(a=>{
                const [user, ask=user]=a.split(":")
                return {ask}
            }).reduce((data,a, i)=>{
                if(0 === i%2){
                    data.push(a)
                }else{
                    data[data.length-1].text=a.ask
                }
            },[])
    }
}

const Paste=({id})=>{
    const dispatch=useDispatch()
    return <PressableIcon name="content-paste" onPress={e=>Clipboard.getStringAsync().then(text=>{
        const dialog=DialogBook.parse(text)
        dispatch({type:"talk/toggle", talk:{id, data:dialog}})
    })}/>
}