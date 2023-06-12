import React from "react"
import { Text, Pressable, View , Linking} from "react-native"
import { useDispatch, useSelector,  } from "react-redux"
import { FlyMessage, PressableIcon, Speak,  } from "../components"
import { TaggedListMedia } from "./media"
import { TaggedTranscript } from "./tagged-transcript"
import * as Clipboard from "expo-clipboard"
import { ColorScheme } from "../components/default-style"
import { Chat1 } from "./chat"
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
            prompt:(a,store)=>{
                const state=store.getState()
                const {mylang, lang}=state.my
                const existings=Object.values(state.talks)
                    .filter(b=>b.slug=="vocabulary" && b.category==a.category)
                    .map(b=>b.words.map(b=>b.lang).join(","))
                    .join(",")

                return `list ${a.amount} words for locale ${lang} about ${a.category} with translation to locale ${mylang}.
                    Each must format like word:translation , and You must put all words in one paragraph using ; to seperate.
                    You can't respond anything else.
                    ${existings ? `I already know these words: ${existings}` : ''}`
            },

            onSuccess({response,dispatch}){
                const {category}=this.params
                const words=response.split(";").map(VocabularyBook.parse).filter(a=>!!a).flat()
                const id=VocabularyBook.create({data:words,title:category, category}, dispatch)
                return `save to @#${id}`
            }
        },{
            label:"Idioms", name:"category",
            params:{
                amount:"10",
                category:"meeting"
            }, 
            speakable:false,
            prompt:a=>`list ${amount} idioms used in ${a.category} with explanation and an example. 
            your response should only contain the idioms, 
            and its format must be json format`,

            onSuccess({response,dispatch}){
                const {category}=this.params
                const {idioms}=JSON.parse(response.replace(/\"idiom\"\:/g, '"word":').replace(/\"translation\"\:/,'"translated":'))
                const title=`idioms(${category})`
                const id=VocabularyBook.create({data:idioms,title, category}, dispatch)
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
            const label=getShowText(data[i])
            cues.push(!locale ? {label, text:translated, ask:word, recogLocale:true} : {label, text:word, ask:translated})
            return cues
        },[])
    }

    renderAt({ask, label},i){
        const {locale}=this.state
        return (
            <>
            <Text style={{padding:10}}>{label.replace("-","\n").replace(".","\n")}</Text>
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

    static TaggedTranscript({}){
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
    const {widgets={}, tts:{mylang}}=useSelector(state=>state.my)
    const words=challenges.map(a=>a.ask).join(",")
    if(widgets.chat===false || !words)
        return null

    return (
        <View>
            <PressableIcon name="support" onPress={e=>setCreating(true)}/>
            {creating && <Chat1 
                prompt={`use the following words to make a sentence to memorize them: ${words}. 
                    Your response should only include the sentence and translation to ${mylang}. 
                    the format must be json.`}
                onSuccess={({response})=>{
                    dispatch({
                        type:"talk/challenge", 
                        talk, 
                        chunk:JSON.parse(response.replace(/\"sentence\"\:/ig, '"word":').replace(/\"translation\"\:/ig,'"translated":')), 
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

function getShowText({word, pronunciation, translated, classification, explanation}){
    pronunciation=pronunciation ? `[${pronunciation}]` : ""
    translated= translated? `:${translated}` : ""
    classification= classification ? `${classification}. ` : ""
    let extra = [classification,explanation||""].filter(a=>!!a).join("")
    extra = extra ? `- ${extra}` : ""
    return `${word}${pronunciation}${translated} ${extra}`
}