import React from "react"
import { TaggedListMedia, TagManagement } from "./media"
import { Link } from "react-router-native"
import { PressableIcon } from "../components"
import * as Clipboard from "expo-clipboard"
import { useDispatch } from "react-redux"

export default class DialogBook extends TaggedListMedia{
    static defaultProps={
        id:"dialog",
        slug:"dialog",
        description:"dialogs",
        title: "practise spoken english",
        thumb: require("../../assets/widget-picture-book.jpeg")
    }

    static ExtendActions({policyName, talk}){
        return null
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
                const id=`RolePlay-${yourName}-${myName}-${new Date()}`
                create({id,dialog,title}, dispatch)
                return <Link to={`/talk/dialog/${id}`}>Click here to practise</Link>
            }
        },
    ]

    static TagManagement=props=><TagManagement appendable={false} talk={DialogBook.defaultProps} placeholder="Tag: to categorize your dialog book" {...props}/>
    /**
     * A:...
     * B:...
     */
    createTranscript(){
        const state=this.context.store.getState()
        const {dialog=[]}=state.talks[this.props.id]||{}
        const parse = (a,i=a.indexOf(":"))=>[a.substring(0, i), a.substring(i+1)]
            
        return dialog.reduce((cues,a, k)=>{
            if(k % 2==0){
                const [A, B]=[parse(dialog[k]),parse(dialog[k+1])]
                cues.push({ask:A[1],text:B[1]})
            }
            return cues
        },[])
    }

    renderAt({ask},i){
        return <Speak onStart={()=>this.stopTimer()} onEnd={()=>this.resumeTimer(i)}>{ask}</Speak>
    }
}

const Paste=({talk})=>{
    const dispatch=useDispatch()
    return <PressableIcon name="paste" onPress={e=>Clipboard.getStringAsync().then(text=>{
        const lines=text.split("\n").filter(a=>!!a)
        const dialog=lines.filter(a=>a.indexOf(":")!=-1)
        create({id:lines[0],dialog}, dispatch)
    })}/>
}
function create(talk, dispatch){
    dispatch({type:"talk/toggle",id:talk.id, talk:{...DialogBook.defaultProps,...talk, tag:talk.id}})
}
