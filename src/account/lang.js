import React, { useEffect } from "react"
import { SectionList, Pressable, Text, View,  } from "react-native"
import { useDispatch, useSelector } from "react-redux"
import Select from "react-native-select-dropdown"
import TTS from "react-native-tts"

export default function SpeechSetting({}){
    const dispatch=useDispatch()
    const [voices, setVoices]=React.useState([])
    const {lang="en",mylang, tts={}}=useSelector(state=>state.my)
    const textStyle={flex:1, paddingLeft:75}
    useEffect(()=>{
        TTS.voices().then(a=>{
            const sections=a.reduce((sections,current)=>{
                const lang=current.language.toLowerCase();
                (sections[lang]=sections[lang]||[]).push(current)
                return sections
            },{})
            setVoices(Object.keys(sections).map(language => ({language, data: sections[language]})))
        })
    },[])
    const [locales, langs]=React.useMemo(()=>{
        const locales=voices.map(a=>a.language)
        const langs=Array.from(new Set(locales.map(a=>a.split("-")[0])))
        return [locales, langs]
    },[voices]) 
    return (
        <>
            <View style={{flexDirection:"row", alignItems:"center", justifyContent:"center",  marginTop:10, marginBottom:10}}>
                <Text style={{width:"40%"}}>Mother Language</Text>
                <Select style={{flex:1}} data={locales} defaultValueByIndex={locales.indexOf(mylang)} 
                    onSelect={value=>dispatch({type:"my", payload:{mylang:value}})}/>
            </View>
            <SectionList sections={voices.filter(a=>a.language==mylang)} extraData={tts[mylang]} style={{flex:1}}
                keyExtractor={(item)=>`${item.id}${tts[mylang]==item.id ? "-selected" : ""}`}
                renderSectionHeader={({section:{language}})=>null}
                renderItem={({item:{id, name, language, quality}})=>{
                    return (
                        <Pressable style={[{flex:1, flexDirection:"row",height:50, alignItems:"center"},
                            tts[mylang]==id ? {backgroundColor:"skyblue"} : null]} 
                            onPress={()=>{
                                TTS.speak("hello world!",{iosVoiceId:id})
                                dispatch({type:"my/tts", payload:{[mylang]:id}})
                            }}>
                            <Text style={textStyle}>{name}</Text>
                        </Pressable>
                    )
                }}/>

            <View style={{flexDirection:"row", marginTop:10, alignItems:"center", justifyContent:"center", marginBottom:10}}>
                <Text style={{width:"40%"}}>Learning Language</Text>
                <Select style={{flex:1}} data={langs} defaultValueByIndex={langs.indexOf(lang)} 
                    onSelect={value=>dispatch({type:"my", payload:{lang:value.split("-")[0]}})}/>
            </View>

            <SectionList sections={voices.filter(a=>a.language.startsWith(lang))} 
                extraData={tts[lang]} style={{flex:1}}
                keyExtractor={(item)=>`${item.id}${tts[lang]==item.id ? "-selected" : ""}`}
                renderSectionHeader={({section:{language}})=><Text style={{fontSize:20,}}>{language}</Text>}
                renderItem={({item:{id, name, language, quality}})=>{
                    return (
                        <Pressable style={[{flex:1, flexDirection:"row",height:50, alignItems:"center"},
                            tts[lang]==id ? {backgroundColor:"skyblue"} : null]} 
                            onPress={()=>{
                                TTS.speak("hello world!",{iosVoiceId:id})
                                dispatch({type:"my/tts", payload:{[lang]:id}})
                            }}>
                            <Text style={textStyle}>{name}</Text>
                        </Pressable>
                    )
                }}/>
        </>
    )
}
