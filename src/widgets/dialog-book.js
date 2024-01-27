import React from "react"
import { View, Text, Pressable } from "react-native"
import { TaggedListMedia } from "./media"
import { Speak } from "../components"
import PressableIcon from "react-native-use-qili/components/PressableIcon"
import { ColorScheme } from "react-native-use-qili/components/default-style"
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
        {label:"RolePlay", name:"face-retouching-natural",
            params:{
                "Your Role":"Software Engineering Manager",
                "Your Name":"Bob",
                "My Role":"Software Engineer",
                "My Name":"Ray",
                "Scene":"Discuss a message queue solution",
            }, 
            prompt:a=>{
                return `Let's role-play. 
                Your role is ${a["Your Role"]} called ${a["Your Name"]}. 
                My role is ${a["My Role"]} called ${a["My Name"]}.
                the scene: ${a["Scene"]}.
                You must wait for my response before you continue.  
                ${a["Your Name"]}, you start first.`
            },
            settings:{
                dialog:true
            }
        },
        {label:"Dialog", name:"record-voice-over",
            speakable:false,
            params:{
                "Your Role":"Software Engineering Manager",
                "My Role":"Software Engineer",
                "Scene":"Discuss a message queue solution",
            }, 
            prompt:(a,store)=>{
                const {my:{lang}}=store.getState()
                return `
                Please make a short ${lang} language dialog to help learn language ${lang}. 
                One role is ${a["Your Role"]} called Joe. 
                Another role is ${a["My Role"]} called Ray. 
                the scene: ${a["Scene"]}. 
                -------------
                Response Should only contains the dialog. 
                Response MUST be able to directly be parsed by following js code:
                <code>
                const {title, dialog=[]}=JSON.parse(response)
                const {user, text}=dialog[0]
                </code>
                `
            },
            onSuccess({response, store}){
                const {Scene:title}=this.params
                const {my:{lang}}=store.getState()
                const {dialog=[]}=JSON.parse(response)
                const data=DialogBook.parse(dialog)
                const id=DialogBook.create({title, data, params:this.params, generator:"Dialog", lang}, store.dispatch)
                return `save to @#${id}`
            }
        },
    ]

    renderAt({ask},i){
        return this.speak({text:ask})
    }

    static TaggedTranscript(props){
        const color=React.useContext(ColorScheme)
        
        const Item=React.useCallback(({item:{ask, text}, id, index})=>{
            const [playing, setPlaying] = React.useState(false)
            const textStyle={color: playing ? color.primary : color.text}
            
            return (
                <View style={{ flexDirection: "row", marginTop:10}}>
                    <PressableIcon style={{ alignSelf: "flex-start" }}
                        name={playing ? "pause-circle-outline" : "play-circle-outline"} 
                        onPress={e=>setPlaying(!playing)}/>
                    <Pressable style={{ justifyContent: "center", marginLeft: 10, flexGrow: 1, flex: 1 }}>
                            <Text style={textStyle}>{ask}</Text>
                            <Text style={{...textStyle, color:"gray"}}>{text}</Text>
                            {playing && <Speak text={ask} onEnd={e=>setPlaying(false)}/>}
                    </Pressable>
                </View>
            )
        },[])

        return (
            <TaggedTranscript {...props}
                actions={(title,id)=><Paste id={id}/>}
                listProps={{
                    renderItem:Item,
                    keyExtractor:a=>a.ask
                }}
                />
        )
    }

    static parse(dialog){
        if(typeof(dialog)=="string"){
            dialog=dialog.split("\n").filter(a=>!!a)
                .map(a=>{
                    const [user, ask=user]=a.split(":")
                    return {ask, text:" "}
                })
        }else{
            dialog=dialog.map(({user, text})=>({ask:text, text:" "}))
        }
        return dialog.reduce((data,a, i)=>{
                if(0 === i%2){
                    data.push(a)
                }else{
                    data[data.length-1].text=a.ask
                }
                return data
            },[])
    }
}

const Paste=({id})=>{
    const dispatch=useDispatch()
    return <PressableIcon name="content-paste" onPress={e=>Clipboard.getStringAsync().then(text=>{
        const dialog=DialogBook.parse(text)
        dispatch({type:"talk/set", talk:{id, data:dialog}})
    })}/>
}