import React from "react"
import { Text, Pressable, View } from "react-native"
import { useDispatch, useSelector } from "react-redux"
import { FlyMessage, PressableIcon, Speak,  } from "../components"
import { TaggedListMedia } from "./media"
import { TaggedTranscript } from "./tagged-transcript"
import * as Clipboard from "expo-clipboard"
import { ColorScheme } from "../components/default-style"
import { Chat1 } from "./chat"
import { useParams } from "react-router-native"


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

    static ExtendActions({talk}){
        return [
            <Locale key="locale" talk={talk}/>,
            <Sentense key="support" talk={talk}/>
        ]
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
                const words=response.split(";").map(parse).filter(a=>!!a)
                const id=VocabularyBook.create({data:words,title:category, category}, dispatch)
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

    constructor(){
        super(...arguments)
        this.state.locale=this.props.locale
    }

    /**
     * A:B
     * lang:mylang
     */
    createTranscript(){
        const {data=[]}=this.props
        const {locale}=this.state
            
        return data.reduce((cues,{word="", translated=""})=>{
            cues.push(!locale ? {ask:word, text:translated, recogLocale:true} : {ask:translated, text:word})
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

    static TaggedTranscript({}){
        const color=React.useContext(ColorScheme)
        
        const Item=React.useCallback(({item:{word:lang, translated:mylang=""}, id, index})=>{
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
                slug={VocabularyBook.defaultProps.slug}
                actions={(title,id)=><Paste id={id}/>}
                listProps={{
                    renderItem:Item,
                    keyExtractor:a=>a.word
                }}
            />
        )
    }

    static parse(text){
        return text.split(/[\n;]/).filter(a=>!!a)
            .map(line=>{
                const [word="", translated=word]=line.split(":").map(a=>a.trim())
                if(word){
                    return {word, translated}
                }
            }).filter(a=>!!a)
    }
}

/**

 */
const Paste=({id})=>{
    const dispatch=useDispatch()
    return <PressableIcon name="content-paste" onPress={e=>Clipboard.getStringAsync().then(text=>{
        const words=VocabularyBook.parse(text)
        dispatch({type:"talk/toggle",talk:{id, data:words}})
    })}/>
}

const Locale=({talk, id=talk?.id})=>{
    const dispatch=useDispatch()
    const {locale}=useSelector(state=>state.talks[id]||{})
    return <PressableIcon name="translate" onPress={e=>dispatch({type:"talk/toggle",talk, payload:{locale:!locale}})}/>
}

const Sentense=({talk, id=talk?.id})=>{
    const dispatch=useDispatch()
    const { policy } = useParams()
    const [creating, setCreating]=React.useState(false)
    const {challenges=[]}=useSelector(state=>state.talks[id][policy])
    const {admin}=useSelector(state=>state.my)
    const words=challenges.map(a=>a.ask).join(",")
    if(!admin || !words)
        return null

    return (
        <View>
            <PressableIcon name="support" onPress={e=>setCreating(true)}/>
            {creating && <Chat1 
                prompt={`use the following words to make a sentense for me to memorize them: ${words}`}
                onSuccess={({response})=>{
                    dispatch({
                        type:"talk/challenge", 
                        talk, 
                        chunk:{word:response}, 
                        policy
                    })
                    setCreating(false)
                }}
                onError={e=>{
                    setCreating(false)
                    FlyMessage.error(e.message)
                }}
            />}
        </View>
    )
}