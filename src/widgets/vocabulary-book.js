import React from "react"
import { Text, Pressable, View , Linking} from "react-native"
import { useDispatch, useSelector,  } from "react-redux"
import { Speak,  } from "../components"
import PressableIcon from "react-native-use-qili/components/PressableIcon"
import useAsk from "react-native-use-qili/components/useAsk"
import { TaggedListMedia } from "./media"
import { TaggedTranscript, clean, getItemText, Delay } from "./management/tagged-transcript"
import * as Clipboard from "expo-clipboard"
import { ColorScheme } from "react-native-use-qili/components/default-style"
import { useNavigate, useParams } from "react-router-native"
import PlayerContext from "../components/player/Context"
import FlyMessage from "react-native-use-qili/components/FlyMessage"
import { prompt } from "react-native-use-qili/components/Prompt"
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

    static ExtendActions({talk, policyName}){
        return [
            <Usage key="usage" talk={talk} policyName={policyName}/>,
            <Sentense key="support" talk={talk} policyName={policyName}/>,
            <Shuffle key="shuffle" talk={talk} policyName={policyName}/>,
        ]
    }

    static prompts=[
        {label:"Vocabulary", name:"menu-book",
            params:{
                "category":"Kitchen",
                "amount": "10",
            }, 
            speakable:false,
            prompt(a,store){
                const state=store.getState()
                const {mylang, lang}=state.my
                const existings=Object.values(state.talks)
                    .filter(b=>b.slug=="vocabulary" && b.category==a.category)
                    .map(b=>b.data.map(b=>b.text).join(","))
                    .join(",")

                return `list ${a.amount} words of ${lang} language about ${a.category}.
                    ${existings ? `I already know these words: ${existings}` : ''}
                    -------
                    Response should NOT have anything else. 
                    Each word should have [pronunciation] at end, then (translation).
                    Prounciation should use International Phonetic Alphabets. 
                    Translation target language should be ${mylang}.
                    Translation should NOT have prounciation.
                    `
            },

            onSuccess({response,store}){
                const {category, amount, title=category}=this.params
                const {my:{mylang,lang}}=store.getState()

                try{
                    const data=VocabularyBook.parse(response)
                    const id=VocabularyBook.create({data, title, params:this.params, generator:"Vocabulary", lang, mylang}, store.dispatch)
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
                return `list ${a.amount} idioms of ${lang} language used in ${a.category} with ${mylang} language translation, and an ${lang} example.
                ------------ 
                    Response should NOT have anything else.
                    Response should be json format with keys: idiom,pronunciation,translation,example.
                ------
                `
            },

            onSuccess({response,store, id}){
                const {category, amount}=this.params
                const {lang, mylang}=store.getState().my
                try{
                    const idioms=JSON.parse(response.replace(/\"idiom\"\:/g, '"text":').replace(/\"translation\"\:/,'"translated":'))
                    const title=`idioms - ${category}`
                    id=VocabularyBook.create({id, data:idioms,title, generator:"idioms",params:this.params, lang, mylang}, store.dispatch)
                    return `${amount} ${category} idioms save to @#${id}`
                }catch(e){
                    return e.message
                }
            }
        }
    ]

    static getDerivedStateFromProps({policy:{usage=0}={}}){
        return {usage}
    }

    /**
     * A:B
     * lang:mylang
     */
    createTranscript({shuffle}={}){
        const {state:{usage}, props:{data=[]}}=this
        
        return (shuffle ? this.shuffleArray([...data]) : data)
            .map(({word, text=word, translated},i, all)=>{
                const fulltext=getItemText(all[i], true, "\n\n")
                switch(usage){
                    case 0://lang -> mylang
                        return {text, test:translated||text, recogMyLocale:!!translated, fulltext}
                    case 1://mylang->lang
                        return {text:translated||text, test:text, speakMyLocale:!!translated, fulltext}
                    case 2://pronouncing
                        return {text,fulltext}
                }
            })
    }

    renderAt(cue){
        const {policy, whitespacing}=this.props
        const {text, test=text, speakMyLocale, fulltext}=cue
        
        const title= policy.fullscreen ? fulltext : test
        return (
            <>
                <Text style={{padding:10, color:"white", textAlign:"center", fontSize:20}}>
                    {!!whitespacing && !!policy.caption && <Delay seconds={policy.captionDelay}>{title}</Delay>}
                </Text>
                {this.speak({locale:speakMyLocale, text})}
            </>
        ) 
    }

    shouldComponentUpdate(props, {usage:next=0}){
        const {usage:current=0}=this.state
        if(current!=next){
            this.setState({usage:next},()=>{
                this.createChunks()
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
            return (
                <View style={{ flexDirection: "row", height: 50, backgroundColor: isActive ? 'skyblue' : 'transparent', borderRadius:5,}}>
                    <PressableIcon name={playing ? "pause-circle-outline" : "play-circle-outline"} 
                        onPress={e=>setPlaying(!playing)}/>
                    <Pressable 
                        onPress={e=>setActive(isActive ? -1 : index)}
                        onLongPress={e=>lang=="en" && Linking.openURL(`https://www.synonym.com/synonyms/${text}`)}
                        style={{ justifyContent: "center", marginLeft: 10, flexGrow: 1, flex: 1 }}>
                            <Text style={textStyle}>{React.useMemo(()=>getItemText(item),[item])}</Text>
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
                actions={
                    <>
                        <Paste id={id}/>
                        <Split id={id}/>
                    </>
                }
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
                    getItemText
                }}
            />
        )
    }

    static parse(input){
        return input.split(/[\n;]/).filter(a=>!!a)
            .map(a=>{
                a=a.replace(/^\d+\.\s+/, "").trim()
                let pronunciation, translated;
                a=a.replace(/\[(?<pronunciation>.*)\]/,(a,p1)=>{
                    pronunciation=p1.trim()
                    return ""
                }).trim();
                a=a.replace(/[\(（](?<translated>.*)[\)）]/,(a,p1)=>{
                    translated=p1.trim()
                    return ""
                }).trim()
                if(a){
                    return clean({text:a, pronunciation, translated})
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

const Split=({id})=>{
    const dispatch=useDispatch()
    const navigate=useNavigate()
    return <PressableIcon name="clear-all" 
        onPress={async e=>{
            const num=await prompt(l10n["How many do you want each contains?"])
            if(!num)
                return 
            const number=parseInt(num)
            if(number>1){
                dispatch({type:"talk/split",talk:{id}, number})
                navigate(`/widget/${VocabularyBook.defaultProps.slug}`)
            }
        }}/>
}

const Usage=({talk, id=talk?.id, policyName})=>{
    const dispatch=useDispatch()
    const {firePlayerEvent}=React.useContext(PlayerContext)
    const {usage=0}=useSelector(state=>state.talks[id]?.[policyName]||{})
    return <PressableIcon 
        name={UsageIcons[usage]} 
        color={UsageColors[usage]}
        onPress={e=>{
            dispatch({type:"talk/clear/policy/history", talk:{id}, policy: policyName})
            dispatch({type:"talk/policy",talk:{id}, target:policyName, payload:{usage:(usage+1)%3}})
            firePlayerEvent("nav/reset")
        }}/>
}

const Sentense=({talk, id=talk?.id})=>{
    const dispatch=useDispatch()
    const {firePlayerEvent}=React.useContext(PlayerContext)
    const ask=useAsk()
    const { policy: policyName } = useParams()
    const {challenges=[], challenging, usage, }=useSelector(state=>state.talks[id]?.[policyName]||{})
    const {lang}=useSelector(state=>state.my)
    const words=challenges.map(({test, text})=>usage==1 ? test : text).join(",")
    if(challenging < 2 || !words )
        return null

    return (
        <PressableIcon name="support" color="blue"
            onPress={e=>{
                (async()=>{
                    try{
                        const response=await ask(`
                            use the following ${lang} language words to make one sentence or paragraph. 
                            ---------word start------
                            ${words}
                            ---------word end------- 
                            Response should NOT have anything else.
                        `)
                        
                        dispatch({
                            type:"talk/chanllenge/longmemory/sentence", 
                            talk:{id}, policyName, 
                            chunk:{text:response,test:words, usage}
                        })
                        firePlayerEvent("nav/reset")
                        FlyMessage.show(`appended to long memory`)
                    }catch(e){
                        FlyMessage.error(e.message)
                    }
                })();
            }}/>
    )
}

function Shuffle({talk, id=talk?.id, policyName}){
    const dispatch=useDispatch()
    const {media: book, firePlayerEvent}=React.useContext(PlayerContext)
    const {challenging}=useSelector(state=>state.talks[id]?.[policyName]||{})
    if(challenging)
        return null
    return <PressableIcon name="shuffle" 
        onPress={e=>{
            const challenges=book.current.createChunks({shuffle:true, update:false})
            dispatch({type:"talk/challenge/shuffle", talk:{id}, policyName, challenges})
            firePlayerEvent("nav/reset")
        }}/>
}

const UsageIcons=["translate", "translate", "graphic-eq"]
const UsageColors=[, "yellow", "white"]

/**
example:
Bonjour: hello

 */