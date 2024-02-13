import React from "react"
import { Text, Pressable, View , Linking} from "react-native"
import { useDispatch, useSelector,  } from "react-redux"
import { Speak,  } from "../components"
import PressableIcon from "react-native-use-qili/components/PressableIcon"
import useAsk from "react-native-use-qili/components/useAsk"
import { TaggedListMedia } from "./media"
import { TaggedTranscript, clean, getItemText, Delay } from "./tagged-transcript"
import * as Clipboard from "expo-clipboard"
import { ColorScheme } from "react-native-use-qili/components/default-style"
import { useParams } from "react-router-native"
import { Context as PlayerContext} from "../components/player"
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
                return `list ${a.amount} idioms of ${lang} language used in ${a.category} with ${mylang} language translation, and an ${lang} example.
                ------------ 
                    Response should NOT have anything else.
                    Response should be json format with keys: idiom,pronunciation,translation,example.
                ------
                `
            },

            onSuccess({response,store}){
                const {category, amount}=this.params
                const {lang, mylang}=store.getState().my
                try{
                    const idioms=JSON.parse(response.replace(/\"idiom\"\:/g, '"text":').replace(/\"translation\"\:/,'"translated":'))
                    const title=`idioms - ${category}`
                    const id=VocabularyBook.create({data:idioms,title, generator:"idioms",params:this.params, lang, mylang}, store.dispatch)
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

    constructor({data, shuffle}){
        super(...arguments)
        this.state.data=this.shuffleArray([...data])
    }

    /**
     * A:B
     * lang:mylang
     */
    createTranscript(){
        const {data=[]}=this.state
        const {usage}=this.state
        
        return data.map(({word, text=word, translated})=>{
                switch(usage){
                    case 0://lang -> mylang
                        return {text, test:translated||text, recogMyLocale:!!translated&&true}
                    case 1://mylang->lang
                        return {text:translated||text, test:text, speakMyLocale:!!translated&&true}
                    case 2://pronouncing
                        return {text}
                }
            })
    }

    renderAt(cue,i){
        const {policy, id, whitespacing}=this.props
        const {data=[]}=this.state
        const {text, test, speakMyLocale}=cue
        
        const title=(()=>{
            if(!whitespacing){
                return null
            }

            if(policy.fullscreen){
                return getItemText(data[i], true, "\n\n")
            }else{
                return test||text
            }
        })();

        return (
            <>
                <Text style={{padding:10, color:"white", textAlign:"center", fontSize:20}}>
                    {policy.caption && <Delay seconds={policy.captionDelay}>{title}</Delay>}
                </Text>
                {this.speak({locale:speakMyLocale, text})}
            </>
        ) 
    }

    shouldComponentUpdate(props, {usage:next=0}){
        const {usage:current=0}=this.state
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

const Usage=({talk, id=talk?.id, policyName})=>{
    const dispatch=useDispatch()
    const {onAction}=React.useContext(PlayerContext)
    const {usage=0}=useSelector(state=>state.talks[id]?.[policyName]||{})
    return <PressableIcon 
        name={UsageIcons[usage]} 
        color={UsageColors[usage]}
        onPress={e=>{
            dispatch({type:"talk/clear/policy/history", talk:{id}, policy: policyName})
            dispatch({type:"talk/policy",talk:{id}, target:policyName, payload:{usage:(usage+1)%3}})
            onAction("talk/clear/policy/history")
        }}/>
}

const Sentense=({talk, id=talk?.id})=>{
    const dispatch=useDispatch()
    const ask=useAsk({timeout:2*60*1000})
    const { policy: policyName } = useParams()
    const {challenges=[]}=useSelector(state=>state.talks[id]?.[policyName]||{})
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
                            policy: policyName
                        })
                    }catch(e){
                        console.error(e)
                    }
                })();
            }}/>
    )
}

const UsageIcons=["translate", "translate", "graphic-eq"]
const UsageColors=[, "yellow", "white"]

/**
example:
Bonjour: hello

 */