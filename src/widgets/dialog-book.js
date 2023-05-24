import React from "react"
import { TaggedListMedia } from "./media"
import { PressableIcon } from "../components"
import * as Clipboard from "expo-clipboard"
import { useDispatch } from "react-redux"

export default class DialogBook extends TaggedListMedia{
    static defaultProps={
        ...super.defaultProps,
        id:"dialog",
        slug:"dialog",
        description:"Dialog Practice",
        title: "Dialog Book",
        thumb: require("../../assets/widget-dialog-book.png")
    }

    static ExtendActions({policyName, talk}){
        return policyName=="general" ? <Paste talk={talk}/> : null
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
    ]

    /**
     * A:...
     * B:...
     */
    createTranscript(){
        const {dialog= this.isMaster ? Samples : []}=this.props
        const parse = a=>{
            if(!a){
                return ["error",""]
            }
            if(typeof(a)=="object")
                return [a.user,a]
            const i=a.indexOf(":")
            return [a.substring(0, i), a.substring(i+1)]
        }
            
        return dialog.reduce((cues,a, k)=>{
            if(k % 2==0){
                const [A, B]=[parse(dialog[k]),parse(dialog[k+1])]
                cues.push({ask:A[1],text:B[1]})
            }
            return cues
        },[])
    }

    renderAt({ask},i){
        return this.speak({text:ask})
    }


}

const Paste=({talk})=>{
    const dispatch=useDispatch()
    return <PressableIcon name="content-paste" onPress={e=>Clipboard.getStringAsync().then(text=>{
        const [title,lines]=text.split("\n").filter(a=>!!a)
        const dialog=lines.filter(a=>a.indexOf(":")!=-1)
        DialogBook.create({title,dialog}, dispatch)
    })}/>
}

const Samples=[
    "Joe: How are you doing?",
    "David: Pretty Good. And you?"
]
