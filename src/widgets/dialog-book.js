import React from "react"
import { View, Text, Pressable } from "react-native"
import { TaggedListMedia } from "./media"
import { Speak } from "../components"
import PressableIcon from "react-native-use-qili/components/PressableIcon"
import { ColorScheme } from "react-native-use-qili/components/default-style"
import { TaggedTranscript, clean, getItemText, Delay } from "./management/tagged-transcript"
import * as Clipboard from "expo-clipboard"
import { useDispatch } from "react-redux"

/*
[{
    ask, pronunciation, translated, user,        
    text:answer, pronunciation1, translated1, user1,   
}]
*/
export default class DialogBook extends TaggedListMedia{
    static defaultProps={
        ...super.defaultProps,
        id:"dialog",
        slug:"dialog",
        description:"Dialog Practice",
        title: "Dialog Book",
        thumb: require("../../assets/widget-dialog-book.png")
    }

    static prompts=[
        {label:"Dialog", name:"record-voice-over",
            speakable:false,
            params:{
                "Your Role":"Software Engineering Manager",
                "My Role":"Software Engineer",
                "Scene":"Discuss a message queue solution",
            }, 
            prompt:(a,store)=>{
                const {my:{lang, mylang}}=store.getState()
                return `
                Please make a short ${lang} language dialog to help learn ${lang} language. 
                One role is ${a["Your Role"]} called Joe. 
                Another role is ${a["My Role"]} called Ray. 
                the scene: ${a["Scene"]}. 
                --
                Response should NOT have anything else. 
                Response should provide the entire dialog at once.
                Each dialog should have [pronunciation] at end, then (translation).
                Prounciation should use International Phonetic Alphabets. 
                Translation target language should be ${mylang}.
                --
                `
            },
            onSuccess({response, store}){
                const {Scene:title}=this.params
                const {my:{lang}}=store.getState()
                const data=DialogBook.parse(response)
                const id=DialogBook.create({title, data, params:this.params, generator:"Dialog", lang}, store.dispatch)
                return `dialog(${title}) save to @#${id}`
            }
        },
    ]

    createTranscript(){
        const {data=[]}=this.props
        return data.map(({ask, text, translated1})=>({
            text: ask,
            test: text,
            my: translated1
        }))
    }

    renderAt(cue,i){
        const {data=[], whitespacing, policy, id}=this.props
        const {text, test}=cue
        const title=(()=>{
            if(!whitespacing){
                return null
            }

            if(policy.fullscreen){
                const {pronunciation1:pronunciation, translated1:translated}=data[i]
                return getItemText({text:test, pronunciation, translated}, true, "\n\n")
            }else{
                return test
            }
        })();
        return (
            <>
                <Text style={{padding:10, color:"white"}}>
                    {policy.caption && <Delay seconds={policy.captionDelay}>{title}</Delay>}
                </Text>
                {this.speak({text})}
            </>
        )
    }

    shouldComponentUpdate({policy:{fullscreen:next=false}}){
        const {policy:{fullscreen:current=false}}=this.props
        if(current!=next){
            this.setState({fullscreen:next},()=>{
                this.reset()
                this.doCreateTranscript()
            })
        }
        return super.shouldComponentUpdate(...arguments)
    }

    static TaggedTranscript({id, ...props}){
        const color=React.useContext(ColorScheme)
        const dispatch=useDispatch()
        
        const Item=React.useCallback(({item:{ask, text, pronunciation, translated, pronunciation1, translated1, }, id, index, isActive, setActive})=>{
            const [playing, setPlaying] = React.useState(false)
            const textStyle={color: playing ? color.primary : color.text}
            
            return (
                <View style={{ flexDirection: "row", height: 100, overflow:'hidden',
                    backgroundColor: isActive ? 'skyblue' : 'transparent', borderRadius:5,
                    }}>
                    <PressableIcon name={playing ? "pause-circle-outline" : "play-circle-outline"} 
                        onPress={e=>setPlaying(!playing)}/>
                    <Pressable 
                        onPress={e=>setActive(isActive ? -1 : index)}
                        style={{ justifyContent: "center", marginLeft: 10, flexGrow: 1, flex: 1 }}>
                            <Text style={textStyle}>{getItemText({text:ask, pronunciation, translated,},false)}</Text>
                            <Text style={{...textStyle, color:"gray"}}>{getItemText({text, pronunciation:pronunciation1, translated:translated1,},false)}</Text>
                            {playing && <Speak text={ask} onEnd={e=>setPlaying(false)}/>}
                    </Pressable>
                    <PressableIcon name="remove-circle-outline" 
                        onPress={e=>dispatch({type:"talk/book/remove/index", index, id})}/>
                </View>
            )
        },[])

        return (
            <TaggedTranscript {...props} id={id}
                actions={<Paste id={id} key="paste"/>}
                listProps={{
                    renderItem:Item,
                    keyExtractor:a=>a.ask
                }}
                editor={{
                    placeholder:"how're you?\n\nfine.",
                    onAdd(text){
                        const appending=DialogBook.parse(text.replace(">","\n"))
                        dispatch({type:"talk/book/add", id, appending})
                    },
                    onChange(text, i){
                        const appending=DialogBook.parse(text.replace(">","\n"))
                        dispatch({type:"talk/book/replace", id, i, appending})
                    },

                    getItemText({ask, text, pronunciation, translated, pronunciation1, translated1}){
                        return `${getItemText({text:ask, pronunciation, translated})}\n\n${getItemText({text,pronunciation:pronunciation1,translated:translated1})}`
                    },

                    multiline:true,

                    editingStyle: {height:200},

                    onSubmitEditing:e=>e,
                }}
                />
        )
    }

    static parse(dialog){
        if(typeof(dialog)=="string"){
            dialog=dialog.split("\n").filter(a=>!!a)
                .map(a=>{
                    let user, pronunciation, translated;
                    a=a.replace(/\[(?<pronunciation>.*)\]/,(a,p1)=>{
                        pronunciation=p1
                        return ""
                    }).trim();
                    a=a.replace(/[\(（](?<translated>.*)[\)）]/,(a,p1)=>{
                        translated=p1
                        return ""
                    }).trim();
                    const ask=a.replace(/^(?<user>\w+)\s*\:\s*/,(a,p1)=>{
                        user=p1
                        return ""
                    }).trim();
                    return {ask, text:" ", pronunciation, translated, user}
                })
        }else{
            dialog=dialog.map(({text, ...props})=>({...props, ask:text, text:" "}))
        }
        return dialog.reduce((data,a, i)=>{
                if(0 === i%2){
                    data.push(a)
                }else{
                    clean(Object.assign(data[data.length-1], {
                        text:a.ask,
                        pronunciation1: a.pronunciation,
                        translated1:a.translated,
                        user1: a.user
                    }))
                }
                return data
            },[])
    }
}

const Paste=({id})=>{
    const dispatch=useDispatch()
    return <PressableIcon name="content-paste" onPress={e=>Clipboard.getStringAsync().then(text=>{
        const dialog=DialogBook.parse(text)
        dispatch({type:"talk/set", talk:{id, data:dialog}})
    })}/>
}