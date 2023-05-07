import React, { useEffect } from "react"
import { connect, useDispatch, useSelector } from "react-redux"
import { PressableIcon, Speak } from "../components"
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
            prompt:a=>`You are english teacher. 
                I am an english learner from China.  
                Please list ${a.amount} words of ${a.category} with Chinese translation.
                Your response format is like 'hand: n, 你好; good: adj, 很好' without pinyin.`,

            onSuccess({response,dispatch}){
                const {category}=this.params
                const words=response.split("\n").filter(a=>!!a)
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
            prompt:a=>`You are english teacher. 
                I am an english learner from China.  
                Please list ${a.amount} words of ${a.category} with Chinese translation.
                Your response format is like 'hand: n, 你好; good: adj, 很好' without pinyin.`,

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
        const state=this.context.store.getState()
        const {words=[]}=state.talks[this.props.id]||{}
        const parse = (a,i=a.indexOf(":"))=>[a.substring(0, i), a.substring(i+1)]
            
        return words.reduce((cues,a)=>{
            const [ask, text]=parse(a)
            cues.push(!this.state.reverse ? {ask, text} : {ask:text, text:ask})
            return cues
        },[])
    }

    renderAt({ask},i){
        const {reverse}=this.props
        return this.speak({reverse, text:ask})
    }

    componentDidUpdate(props, state){
        if((!!this.state.reverse)!=(!!state.reverse)){
            this.reset()
            this.onPlaybackStatusUpdate()
            this.doCreateTranscript()
        }
    }

    render(){
        return (
            <>
                {super.render()}
                <ReverseLangWatcher id={this.props.id} onChange={reverse=>this.setState({reverse})}/>
            </>
        )
    }
}

const ReverseLangWatcher=({id, onChange})=>{
    const {reverse}=useSelector(state=>state.talks[id]||{})
    const {lang, mylang, tts={}}=useSelector(state=>state.my)
    useEffect(()=>{
        if(id){
            onChange(reverse)
            Speech.setDefaults(reverse ? {lang:mylang, voice: tts[mylang]} : {lang, voice:tts[lang]})
            return ()=>Speech.setDefaults({lang, voice:tts[lang]})
        }
    },[reverse])
    return null
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