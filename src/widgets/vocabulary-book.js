import React from "react"
import { Text, Pressable, View , Linking} from "react-native"
import { useDispatch, useSelector,  } from "react-redux"
import { Speak,  } from "../components"
import PressableIcon from "react-native-use-qili/components/PressableIcon"
import useAsk from "react-native-use-qili/components/useAsk"
import { TaggedListMedia } from "./media"
import { TaggedTranscript } from "./tagged-transcript"
import * as Clipboard from "expo-clipboard"
import { ColorScheme } from "react-native-use-qili/components/default-style"
import { useParams } from "react-router-native"
const l10n=globalThis.l10n

/**
 * {text:word, translated, pronunciation, classification, explanation, example}
 * cue: {ask:player speak, text: display, recognize, and compare}
 * 
 * usage:
 * for pronunciation: text -> text (tts:lang, recognize:lang)
 * for memoization: lang->mylang (tts:lang, recognize:mylang), mylang->lang (tts:mylang, recognize:lang)
 */
export default class VocabularyBook extends TaggedListMedia{
    static defaultProps={
        ...super.defaultProps,
        id:"vocabulary",
        slug:"vocabulary",
        title:"Vocabulary Book",
        description:"Remember Every Word",
        thumb:require("../../assets/widget-vocabulary-book.png"),
        usage:0,
    }

    static ExtendActions({talk}){
        return [
            <Usage key="usage" talk={talk}/>,
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
                    .map(b=>b.data.map(b=>b.text).join(","))
                    .join(",")

                return `list ${a.amount} words of ${lang} language about ${a.category} with translation to ${mylang} language.
                    ${existings ? `I already know these words: ${existings}` : ''}
                    -------
                    Response should NOT have anything else. 
                    Each line for a word as following example:
                    ----
                    word1 : translated1
                    word2 : translated2
                    ---
                    `
            },

            onSuccess({response,store}){
                const {category, amount}=this.params
                const {my:{mylang,lang}}=store.getState()

                try{
                    const data=VocabularyBook.parse(response)
                    const id=VocabularyBook.create({data,title:category, params:this.params, generator:"Vocabulary", lang, mylang}, store.dispatch)
                    return `${amount} ${category} Vocabulary save to @#${id}`
                }catch(e){
                    return e.message
                }
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
                return `list ${a.amount} idioms of ${lang} language used in ${a.category} with ${mylang} language explaination, and an ${lang} example.
                ------------ 
                    Response should NOT have anything else.
                    Response should be json format with keys: idiom,explanation,example.
                ------
                `
            },

            onSuccess({response,store}){
                const {category, amount}=this.params
                const {lang, mylang}=store.getState().my
                try{
                    const idioms=JSON.parse(response.replace(/\"idiom\"\:/g, '"text":').replace(/\"explanation\"\:/,'"translated":'))
                    const title=`idioms - ${category}`
                    const id=VocabularyBook.create({data:idioms,title, generator:"idioms",params:this.params, lang, mylang}, store.dispatch)
                    return `${amount} ${category} idioms save to @#${id}`
                }catch(e){
                    return e.message
                }
            }
        }
    ]

    constructor(){
        super(...arguments)
        this.state.usage=this.props.usage
    }

    /**
     * A:B
     * lang:mylang
     */
    createTranscript(){
        const {data=[]}=this.props
        const {usage}=this.state
        return data.map(({text="", translated=text})=>{
            switch(usage){
                case 0://lang -> mylang
                    return {text:translated, ask:text, recogMyLocale:true}
                case 1://mylang->lang
                    return {text, ask:translated, speakMyLocale:true}
                case 2://pronouncing
                    return {text, ask:text}
            }
        })
    }

    renderAt({ask, speakMyLocale},i){
        const {data=[]}=this.props
        let {text, pronunciation, translated, classification, explanation,example}=data[i]
        
        pronunciation=pronunciation ? `[${pronunciation}]` : ""
        translated= translated? `: ${translated}` : ""
        classification= classification ? `- ${classification}.` : ""
        const title=`${text} ${pronunciation} ${classification}`

        return (
            <>
            <Text style={{padding:10, color:"white"}}>{[title,explanation,example].filter(a=>!!a).join("\n")}</Text>
            {this.speak({locale:speakMyLocale, text:ask})}
            </>
        )
    }

    shouldComponentUpdate({usage:next=0}){
        const {usage:current=0}=this.props
        if(current!=next){
            this.setState({usage:next},()=>{
                this.reset()
                this.doCreateTranscript()
            })
        }
        return super.shouldComponentUpdate(...arguments)
    }

    static TaggedTranscript({id, ...props}){
        const dispatch=useDispatch()
        const color=React.useContext(ColorScheme)
        const {lang="en"}=useSelector(state=>state.my)
        
        const Item=React.useCallback(({item, id, index, text=item.text, isActive, setActive})=>{
            const [playing, setPlaying] = React.useState(false)
            const textStyle={color: playing ? color.primary : color.text}
            const title=React.useMemo(()=>getShowText(item),[item])
            return (
                <View style={{ flexDirection: "row", height: 50, backgroundColor: isActive ? 'skyblue' : 'transparent', borderRadius:5,}}>
                    <PressableIcon name={playing ? "pause-circle-outline" : "play-circle-outline"} 
                        onPress={e=>setPlaying(!playing)}/>
                    <Pressable 
                        onPress={e=>setActive(isActive ? -1 : index)}
                        onLongPress={e=>lang=="en" && Linking.openURL(`https://www.synonym.com/synonyms/${text}`)}
                        style={{ justifyContent: "center", marginLeft: 10, flexGrow: 1, flex: 1 }}>
                            <Text style={textStyle}>{title}</Text>
                            {playing && <Speak text={text} onEnd={e=>setPlaying(false)}/>}
                    </Pressable>
                    <PressableIcon name="remove-circle-outline" 
                        onPress={e=>dispatch({type:"talk/book/remove/index", index, id})}/>
                </View>
            )
        },[])
        return (
            <TaggedTranscript 
                {...props}
                id={id}
                actions={<Paste id={id}/>}
                listProps={{
                    renderItem:Item,
                    keyExtractor:a=>a.text
                }}
                editor={{
                    placeholder:l10n["hello:你好"],
                    onAdd(text){
                        const appending=VocabularyBook.parse(text)
                        dispatch({type:"talk/book/add", id, appending})
                    },
                    onChange(text, i){
                        const appending=VocabularyBook.parse(text)
                        dispatch({type:"talk/book/replace", id, i, appending})
                    },
                    getItemText({text, translated}){
                        return `${text}${translated ? `:${translated}`:''}`
                    }
                }}
            />
        )
    }

    static parse(input){
        return input.split(/[\n;]/).filter(a=>!!a)
            .map(line=>{
                const [text="", translated]=line.split(":").map(a=>a.trim())
                if(text){
                    const i=text.indexOf('[')
                    if(i!=-1){
                        return {
                            text:text.substring(0,i), 
                            pronunciation:text.substring(i+1,text.lastIndexOf(']')), 
                            translated
                        }
                    }
                    return {text, translated}
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
        dispatch({type:"talk/set",talk:{id, data:words}})
    })}/>
}

const Usage=({talk, id=talk?.id})=>{
    const dispatch=useDispatch()
    const {usage=0}=useSelector(state=>state.talks[id]||{})
    return <PressableIcon 
        name={UsageIcons[usage]} 
        color={UsageColors[usage]}
        onPress={e=>dispatch({type:"talk/set",talk:{id,usage:(usage+1)%3}})}/>
}

const Sentense=({talk, id=talk?.id})=>{
    const dispatch=useDispatch()
    const ask=useAsk({timeout:2*60*1000})
    const { policy } = useParams()
    const {challenges=[]}=useSelector(state=>state.talks[id][policy]||{})
    const {widgets={}, lang}=useSelector(state=>state.my)
    const words=challenges.map(({recogMyLocale, ask, text})=>recogMyLocale ? ask : text).join(",")
    if(widgets.chat===false || !words)
        return null

    return (
        <PressableIcon name="support" 
            onPress={e=>{
                (async()=>{
                    try{
                        const response=await ask(`
                            use the following ${lang} language words to make one sentence or paragraph. 
                            ---------word start------
                            ${words}
                            ---------word end------- 
                            Response should NOT have anything else.
                        `,3*60*1000)
                        
                        dispatch({
                            type:"talk/challenge", 
                            talk, 
                            chunk:{text:response}, 
                            policy
                        })
                    }catch(e){
                        console.error(e)
                    }
                })();
            }}/>
    )
}

function getShowText({text, pronunciation, translated, classification, explanation}){
    pronunciation=pronunciation ? `[${pronunciation}]` : ""
    translated= translated? `: ${translated}` : ""
    classification= classification ? `${classification}. ` : ""
    let extra = [classification,explanation||""].filter(a=>!!a).join("")
    extra = extra ? `- ${extra}` : ""
    return `${text}${pronunciation}${translated} ${extra}`
}

const UsageIcons=["translate", "translate", "graphic-eq"]
const UsageColors=[, "yellow", "white"]

/**
example:
Bonjour: hello

 */