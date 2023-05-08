import React from "react"
import { useDispatch, useSelector } from "react-redux"
import { PressableIcon } from "../components"
import { TaggedListMedia, TagManagement } from "./media"

export default class VocabularyBook extends TaggedListMedia{
    static defaultProps={
        ...super.defaultProps,
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
        {label:"vocabulary", name:"menu-book",
            params:{
                "category":"Kitchen",
                "amount": "10",
            }, 
            speakable:false,
            prompt:a=>`You are english teacher. I am an english learner from China.  
                Please list ${a.amount} words of ${a.category} with Chinese translation.
                Your response format is like 'hand: 手;good: 很好' without pinyin, and put all words in one paragraph, instead of a list. each word is seperated with ';'.`,

            onSuccess({response,dispatch}){
                const {category}=this.params
                const words=response.split(";").filter(a=>!!a).map(a=>{
                    const [lang, mylang]=a.split(":")
                    return {lang:lang.trim(), mylang:mylang.trim()}
                })
                const title=`vocabulary(${category})`
                const id=VocabularyBook.create({words,title}, dispatch)
                return `save to @#${id}`
            }
        },{
            label:"voca cluster", name:"menu-book",
            params:{
                "category":"Kitchen",
                "amount": "30",
            }, 
            speakable:false,
            prompt:a=>`You are english teacher. I am an english learner from China.  
                Please use the following words to make a sentence to help me remember them.`,

            onSuccess({response,dispatch}){
                const {category}=this.params
                const words=response.split("\n").filter(a=>!!a)
                const title=`vocabulary(${category})`
                const id=VocabularyBook.create({words,title}, dispatch)
                return `save to @#${id}`
            }
        }
    ]

    static TagManagement=props=><TagManagement appendable={false} talk={VocabularyBook.defaultProps} placeholder="Tag: to categorize your vocabulary book" {...props}/>
    constructor(){
        super(...arguments)
        this.state.reverse=this.props.reverse
    }
    /**
     * A:B
     * lang:mylang
     */
    createTranscript(){
        const {words=[]}=this.props
        const {reverse}=this.state
            
        return words.reduce((cues,{lang, mylang})=>{
            cues.push(!reverse ? {ask:lang, text:mylang, recogLocale:true} : {ask:mylang, text:lang})
            return cues
        },[])
    }

    renderAt({ask},i){
        const {reverse}=this.state
        return this.speak({reverse, text:ask})
    }

    shouldComponentUpdate(props, state){
        if((!!this.props.reverse)!=(!!props.reverse)){
            this.setState({reverse:props.reverse},()=>{
                this.reset()
                this.doCreateTranscript()
            })
        }
        return super.shouldComponentUpdate(...arguments)
    }
}

const Paste=talk=>{
    const dispatch=useDispatch()
    return <PressableIcon name="content-paste" onPress={e=>Clipboard.getStringAsync().then(text=>{
        const [title,...lines]=text.split(/[\n;]/).filter(a=>!!a)
        const words=lines.filter(a=>a.indexOf(":")!=-1)
        VocalularyBook.create({title, words}, dispatch)
    })}/>
}

const Reverse=({talk, id=talk?.id})=>{
    const dispatch=useDispatch()
    const {reverse}=useSelector(state=>state.talks[id]||{})
    return <PressableIcon name="translate" onPress={e=>dispatch({type:"talk/toggle",talk, payload:{reverse:!reverse}})}/>
}