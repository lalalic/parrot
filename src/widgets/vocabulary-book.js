import React from "react"
import { useSelector } from "react-redux"
import { PressableIcon } from "../components"
import { TaggedListMedia } from "./media"

export default class VocabularyBook extends TaggedListMedia{
    static defaultProps={
        id:"vocabulary",
        slug:"vocabulary",
        title:"remember words",
        description:"",
        thumb:require("../../assets/widget-picture-book.jpeg"),
        reverse:false,
    }

    static ExtendActions({policyName, talk}){
        return policyName=="general" ? <Paste talk={talk}/> : <Reverse talk={talk}/>
    }

    static prompts=[
        {label:"vocabulary", name:"vocabulary",
            params:{
                "category":"",
                "amount": "10",
            }, 
            speakable:false,
            prompt:a=>`You are english teacher. 
                I'm an english learner from China.  
                Please list ${a.amount} words of ${a.category} with Chinese translation.
                Your response format is like "hand: n, 你好; good: adj, 很好"`,

            onSuccess({response,dispatch}){
                const {category, amount}=this.params
                const words=response.split("\n")
                const title=`vocabulary(${category})`
                const id=`${category}-${new Date()}`
                create({id,words,title}, dispatch)
                return <Link to={`/talk/vocabulary/${id}`}>Click here to practise</Link>
            }
        },
    ]

    static TagManagement=props=><TagManagement appendable={false} talk={VocabularyBook.defaultProps} placeholder="Tag: to categorize your vocabulary book" {...props}/>
    /**
     * A:B
     * lang:mylang
     */
    createTranscript(){
        const state=this.context.store.getState()
        const {words=[]}=state.talks[this.props.id]||{}
        const parse = (a,i=a.indexOf(":"))=>[a.substring(0, i), a.substring(i+1)]
            
        return words.reduce((cues,a)=>{
            const [ask, text]=parse(a)
            cues.push(!this.props.reverse ? {ask, text} : {ask:text, text:ask})
            return cues
        },[])
    }

    renderAt({ask},i){
        const {reverse}=this.props
        const {voice, lang=voice, mylang}=useSelector(state=>state.my.tts||{})
        return <Speak voice={!reverse ? lang : mylang} onStart={()=>this.stopTimer()} onEnd={()=>this.resumeTimer(i)}>{ask}</Speak>
    }
}

const Paste=talk=>{
    const dispatch=useDispatch()
    return <PressableIcon name="paste" onPress={e=>Clipboard.getStringAsync().then(text=>{
        const lines=text.split(/[\n;]/).filter(a=>!!a)
        const words=lines.filter(a=>a.indexOf(":")!=-1)
        create({id:lines[0],words}, dispatch)
    })}/>
}

const Reverse=({talk})=>{
    const dispatch=useDispatch()
    return <PressableIcon name="translate" onPress={e=>dispatch({type:"talk/toggle",id:talk.id, reverse:!talk.reverse})}/>
}

function create(talk, dispatch){
    dispatch({type:"talk/toggle",id:talk.id, talk:{...VocabularyBook.defaultProps,...talk, tag:talk.id}})
}
