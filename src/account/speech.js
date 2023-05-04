import React, { useEffect } from "react"
import { SectionList, Pressable, Text } from "react-native"
import { useDispatch, useSelector } from "react-redux"
import tts from "react-native-tts"

let voices=[]
export default function SpeechSetting({}){
    const dispatch=useDispatch()
    const {voice}=useSelector(state=>state.my.tts||{})
    const textStyle={flex:1, paddingLeft:75}
    useEffect(()=>{
        if(voices.length==0){
            tts.voices().then(a=>{
                const sections=a.reduce((sections,current)=>{
                    (sections[current.language]=sections[current.language]||[]).push(current)
                    return sections
                },{})
                voices=Object.keys(sections).map(language => ({language, data: sections[language]}))
            })
        }
    },[])
    return (
        <SectionList sections={voices} extraData={voice} style={{flex:1}}
            keyExtractor={(item)=>`${item.id}${voice==item.id ? "-selected" : ""}`}
            renderSectionHeader={({section:{language}})=><Text style={{fontSize:20,}}>{language}</Text>}
            renderItem={({item:{id, name, language, quality}})=>{
                return (
                    <Pressable style={[{flex:1, flexDirection:"row",height:50, alignItems:"center"},voice==id ? {backgroundColor:"skyblue"} : null]} 
                        onPress={()=>{
                            tts.speak("hello world!",{iosVoiceId:id})
                            dispatch({type:"tts", tts:{voice:id}})
                        }}>
                        <Text style={textStyle}>{name}</Text>
                    </Pressable>
                )
            }}/>
    )
}