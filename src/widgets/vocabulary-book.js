import React from "react"
import { Text, Pressable, View , Linking} from "react-native"
import { useDispatch, useSelector,  } from "react-redux"
import { PressableIcon, Speak, useAsk,  } from "../components"
import { TaggedListMedia } from "./media"
import { TaggedTranscript } from "./tagged-transcript"
import * as Clipboard from "expo-clipboard"
import { ColorScheme } from "../components/default-style"
import { useParams } from "react-router-native"

/**
 * {word, translated, pronunciation, classification, explanation, example}
 */
export default class VocabularyBook extends TaggedListMedia{
    static defaultProps={
        ...super.defaultProps,
        id:"vocabulary",
        slug:"vocabulary",
        title:"Vocabulary Book",
        description:"Remember Every Word",
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
        {label:"Vocabulary", name:"menu-book",
            params:{
                "category":"Kitchen",
                "amount": "50",
            }, 
            speakable:false,
            prompt(a,store){
                const state=store.getState()
                const {mylang, lang}=state.my
                const existings=Object.values(state.talks)
                    .filter(b=>b.slug=="vocabulary" && b.category==a.category)
                    .map(b=>b.data.map(b=>b.word).join(","))
                    .join(",")

                return `list ${a.amount} words of locale ${lang} about ${a.category} with translation to locale ${mylang}.
                    Each must format like word:translation , and You must put all words in one paragraph using ; to seperate.
                    You can't respond anything else.
                    ${existings ? `I already know these words: ${existings}` : ''}`
            },

            onSuccess({response,store}){
                const {category}=this.params
                const {mylang,lang}=store.getState().my
                const words=response.split(";").map(VocabularyBook.parse).filter(a=>!!a).flat()
                const id=VocabularyBook.create({data:words,title:category, params:this.params, generator:"Vocabulary", lang, mylang}, store.dispatch)
                return `save to @#${id}`
            }
        },{
            label:"Idioms", name:"category",
            params:{
                amount:"10",
                category:"meeting"
            }, 
            speakable:false,
            prompt:(a,store)=>{
                const state=store.getState()
                const {mylang, lang}=state.my
                a.lang=lang
                a.mylang=mylang
                return `list ${a.amount} idioms of locale ${lang} used in ${a.category} with explanation, an example and translation to locale ${mylang}. 
                    your response should only contain the idioms, 
                    and its format must be json format with keys: idiom,explanation,example, translated.`
            },

            onSuccess({response,store}){
                const {category}=this.params
                const {lang, mylang}=store.getState()
                const {idioms}=JSON.parse(response.replace(/\"idiom\"\:/g, '"word":').replace(/\"translation\"\:/,'"translated":'))
                const title=`idioms - ${category}`
                const id=VocabularyBook.create({data:idioms,title, generator:"idioms",params:this.params, lang, mylang}, store.dispatch)
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
            
        return data.reduce((cues,{word="", translated=word}, i)=>{
            cues.push(!locale ? {text:translated, ask:word, recogLocale:true} : {text:word, ask:translated})
            return cues
        },[])
    }

    renderAt({ask, label},i){
        const {data=[]}=this.props
        const {locale}=this.state
        let {word, pronunciation, translated, classification, explanation,example}=data[i]
        
        pronunciation=pronunciation ? `[${pronunciation}]` : ""
        translated= translated? `: ${translated}` : ""
        classification= classification ? `- ${classification}.` : ""
        const text=`${word} ${pronunciation} ${classification}`

        return (
            <>
            <Text style={{padding:10}}>{[text,explanation,example].filter(a=>!!a).join("\n")}</Text>
            {this.speak({locale, text:ask})}
            </>
        )
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

    static TaggedTranscript(props){
        const color=React.useContext(ColorScheme)
        const {lang="en"}=useSelector(state=>state.my)
        
        const Item=React.useCallback(({item, id, index, word=item.word})=>{
            const [playing, setPlaying] = React.useState(false)
            const textStyle={color: playing ? color.primary : color.text}
            const text=getShowText(item)
            return (
                <View style={{ flexDirection: "row", height: 50 }}>
                    <PressableIcon name={playing ? "pause-circle-outline" : "play-circle-outline"} 
                        onPress={e=>setPlaying(!playing)}/>
                    <Pressable 
                        onPress={e=>lang=="en" && Linking.openURL(`https://www.synonym.com/synonyms/${word}`)}
                        onLongPress={e=>setEditing(true)}
                        style={{ justifyContent: "center", marginLeft: 10, flexGrow: 1, flex: 1 }}>
                            <Text style={textStyle}>{text}</Text>
                            {playing && <Speak text={word} onEnd={e=>setPlaying(false)}/>}
                    </Pressable>
                </View>
            )
        },[])
        return (
            <TaggedTranscript {...props}
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
    const ask=useAsk()
    const { policy } = useParams()
    const {challenges=[]}=useSelector(state=>state.talks[id][policy]||{})
    const {widgets={}, mylang}=useSelector(state=>state.my)
    const words=challenges.map(a=>a.ask).join(",")
    if(widgets.chat===false || !words)
        return null

    return (
        <PressableIcon name="support" 
            onPress={e=>{
                (async()=>{
                    const response=await ask(`
                        use the following words to make a sentence to memorize them: ${words}. 
                        Your response should only include the sentence and translation to ${mylang}. 
                        the format must be json.
                    `)
                    dispatch({
                        type:"talk/challenge", 
                        talk, 
                        chunk:JSON.parse(response.replace(/\"sentence\"\:/ig, '"word":').replace(/\"translation\"\:/ig,'"translated":')), 
                        policy
                    })
                })();
            }}/>
    )
}

function getShowText({word, pronunciation, translated, classification, explanation}){
    pronunciation=pronunciation ? `[${pronunciation}]` : ""
    translated= translated? `: ${translated}` : ""
    classification= classification ? `${classification}. ` : ""
    let extra = [classification,explanation||""].filter(a=>!!a).join("")
    extra = extra ? `- ${extra}` : ""
    return `${word}${pronunciation}${translated} ${extra}`
}