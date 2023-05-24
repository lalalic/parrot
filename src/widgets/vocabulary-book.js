import React from "react"
import { useDispatch, useSelector } from "react-redux"
import { PressableIcon } from "../components"
import { TaggedListMedia } from "./media"

export default class VocabularyBook extends TaggedListMedia{
    static defaultProps={
        ...super.defaultProps,
        id:"vocabulary",
        slug:"vocabulary",
        title:"Vocabulary Book",
        description:"",
        thumb:require("../../assets/widget-vocabulary-book.png"),
        locale:false,
    }

    static ExtendActions({policyName, talk}){
        return policyName=="general" ? <Paste talk={talk}/> : <Locale talk={talk}/>
    }

    static prompts=[
        {label:"vocabulary", name:"menu-book",
            params:{
                "category":"Kitchen",
                "amount": "50",
            }, 
            speakable:false,
            prompt:(a,store)=>{
                const state=store.getState()
                const existings=Object.values(state.talks)
                    .filter(b=>b.slug=="vocabulary" && b.category==a.category)
                    .map(b=>b.words.map(b=>b.lang).join(","))
                    .join(",")

                return `I'm an English learner from zh-CN. You are an english tutor. 
                    Please give ${a.amount} vocabulary of ${a.category}.
                    Each must format like spoon: zh-CN translated, and You must put all words in one paragraph using ; to seperate.
                    You can't respond anything else.
                    I already know these words: ${existings}`
            },

            onSuccess({response,dispatch}){
                const {category}=this.params
                const words=response.split(";").filter(a=>!!a).map(a=>{
                    const [lang, mylang]=a.split(":")
                    return {lang:lang.trim(), mylang:mylang.trim()}
                })
                const title=`vocabulary(${category})`
                const id=VocabularyBook.create({words,title, category}, dispatch)
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

    static Shortcut=undefined
    static TagManagement=props=>super.TagManagement({...props, appendable:false})
    constructor(){
        super(...arguments)
        this.state.locale=this.props.locale
    }

    /**
     * A:B
     * lang:mylang
     */
    createTranscript(){
        const {words=this.isMaster ? Samples : []}=this.props
        const {locale}=this.state
            
        return words.reduce((cues,{lang, mylang})=>{
            cues.push(!locale ? {ask:lang, text:mylang, recogLocale:true} : {ask:mylang, text:lang})
            return cues
        },[])
    }

    renderAt({ask},i){
        const {locale}=this.state
        return this.speak({locale, text:ask})
    }

    shouldComponentUpdate(props, state){
        if((!!this.props.locale)!=(!!props.locale)){
            this.setState({locale:props.locale},()=>{
                this.reset()
                this.doCreateTranscript()
            })
        }
        return super.shouldComponentUpdate(...arguments)
    }
}

const Samples=[{lang:"bottle",mylang:"瓶子"},{lang:"Hello", mylang:"你好"}]

const Paste=talk=>{
    const dispatch=useDispatch()
    return <PressableIcon name="content-paste" onPress={e=>Clipboard.getStringAsync().then(text=>{
        const [title,...lines]=text.split(/[\n;]/).filter(a=>!!a)
        const words=lines.filter(a=>a.indexOf(":")!=-1)
        VocalularyBook.create({title, words}, dispatch)
    })}/>
}

const Locale=({talk, id=talk?.id})=>{
    const dispatch=useDispatch()
    const {locale}=useSelector(state=>state.talks[id]||{})
    return <PressableIcon name="translate" onPress={e=>dispatch({type:"talk/toggle",talk, payload:{locale:!locale}})}/>
}