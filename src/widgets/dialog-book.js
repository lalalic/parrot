import React from "react"
import { TaggedListMedia, TagManagement } from "./media"
import { PlaySound, PressableIcon } from "../components"
import * as Clipboard from "expo-clipboard"
import { useDispatch } from "react-redux"

export default class DialogBook extends TaggedListMedia{
    static defaultProps={
        ...super.defaultProps,
        id:"dialog",
        slug:"dialog",
        description:"Dialog Practice",
        title: "Dialog Book",
        thumb: require("../../assets/widget-picture-book.jpeg")
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
                "Talk Rounds": "10",
                "Scene":"We are discussing a solution for a message queue",
            }, 
            speakable:false,
            prompt:a=>`Let's role-play. 
                I'm an english learner.  
                Please make a dialog with at least  ${a["Talk Rounds"]||10} talking rounds.  
                Your response is only the dialog with json format.
                Your role is ${a["Your Role"]}, and your name is ${a["Your Name"]}. 
                My role is ${a["My Role"]}, and my name is ${a["My Name"]}.
                the scene: ${a["Scene"]}. 
                Please Make a dialog with at least  talking rounds.`,

            onSuccess({response,dispatch}){
                const {"Your Name":yourName, "My Name":myName, "Your Role":yourRole, "My Role":myRole}=this.params
                const dialog=response.split("\n").filter(a=>a.startsWith(yourName) || a.startsWith(myName))
                const title=`Role Play(${yourName}[${yourRole}], ${myName}[${myRole}])`
                const id=DialogBook.create({dialog,title}, dispatch)
                return `save to @#${id}`
            }
        },
    ]

    static Shortcut=undefined
    static TagManagement=props=>super.TagManagement({...props,appendable:false})
    /**
     * A:...
     * B:...
     */
    createTranscript(){
        const {dialog=[]}=this.props
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