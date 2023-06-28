import React,{Component, useState} from "react"
import {Recognizer} from "../components"
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView } from "react-native";

const PROMPT=
    `You are an english teacher to help me practise  my speaking english.your`
    /*
     `response sample is awayls a json data like below, and you must fill all fields
    {
        suggestion: your suggestion to improve or fix my words, 
        response: your response to my message
    }`*/
export class Chat extends Component{
    static defaultProps = {
        isMedia:false,
        id: "chat",
        slug: "chat",
        title: "Make a conversation",
        thumb: require("../../assets/widget-picture-book.jpeg"),
        description: "Make a conversation with bot",
    }

    constructor(){
        super(...arguments)
        this.state={audioInput:true,messages:[]}
        this.toggle=this.toggle.bind(this)
        this.submit=this.submit.bind(this)
    }

    componentDidMount(){
        this.createCompletion(PROMPT)
    }

    createCompletion(prompt){
        const {messages}=this.state
        //const prompt=[`system: ${PROMPT}`, messages.slice(-10).map(a=>`${a.role}:${a.text}`)].join("\n")
        
        const apiKey="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"
        return fetch("https://api.openai.com/v1/completions",{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model:"text-davinci-003",
                prompt,
            })
        }).then(res=>res.json(), console.error)
    }

    toggle(){
        this.setState({audioInput:!this.state.audioInput})
    }

    submit(prompt){
        this.setState({messages:[...this.state.messages, {role:"user", text:prompt,created: Date.now()}]})
        this.createCompletion(prompt).then(response=>{
            const {choices:[{text}],created}=response
            const {response:m, suggestion}=(()=>{
                try{
                    return JSON.parse(text)
                }catch(e){
                    return {response:text.trim()}
                }
            })();
            this.setState({messages:[...this.state.messages, {role:"assistant",text:m,created:created}]})
        })
    }

    render(){
        const {audioInput, messages}=this.state
        const props={
            toggle:this.toggle,
            submit:this.submit,
            textStyle:{borderRadius:2, flex:1,backgroundColor:"darkgray",height:"100%",color:"white"},
        }
        return (
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0} // adjust as needed
                >
                <View style={{flexDirection:"column",flex:1, height: "100%"}}>
                    <View style={{flex:1,backgroundColor:"lightgray", padding:4}}>
                        <History messages={messages}/>
                    </View>
                    <View style={{
                        height:50, flexDirection:"row", padding:4,
                        alignItems: 'center', justifyContent: 'center'
                    }}>
                        {audioInput ? <InputAudio {...props}/> : <InputText {...props}/> }
                    </View>
                </View>
            </KeyboardAvoidingView>
        )
    }
}

const InputAudio=({toggle, submit, textStyle})=>{
    const [talking,setTalking]=useState(false)
    return (
        <>
            <Pressable onPress={toggle}>
                <MaterialIcons name="mic" style={{width:50}} color="white" size={36}/>
            </Pressable>
            <Pressable onPressIn={e=>setTalking(true)} onPressOut={e=>setTalking(false)} 
                style={{...textStyle, justifyContent: 'center'}}>
                <Text style={{textAlign:"center",fontSize:16,color:"white"}}>Hold To Talk</Text>
            </Pressable>
            <View style={{width:0}}>{talking && <Recognizer style={{width:0}} onRecord={({recognized})=>submit(recognized)}/>}</View>
        </>
    )
}

const InputText=({toggle, submit, textStyle})=>{
    const [value, setValue]=useState("")
    return (
        <>
            <Pressable onPress={toggle}>
                <MaterialIcons name="keyboard" style={{width:50}} size={36} color="white"/>
            </Pressable>
            <TextInput autoFocus={true} value={value}
                onChangeText={text=>setValue(text)}
                onSubmitEditing={e=>{
                    submit(value)
                    setValue("")
                }} 
                style={{...textStyle,padding:5,fontSize:16}}/>
        </>
    )
}

const History=({messages})=>(
    <>
        {messages.map((m,i)=><Message {...{key:i, m}}/>)}
    </>
)

const Message=({m})=>(
    <View style={{flexDirection:"row", marginBottom:8, direction:m.role!="user" ? "ltr" : "rtl"}}>
        <View>
            <MaterialIcons name={Icons[m.role]} size={30} 
                style={{backgroundColor:"black", borderRadius:4,marginRight:4}} />
        </View>
        <View style={{marginRight:70, borderRadius:4}}>
            <Text style={{color:"black",padding:4,fontSize:16, 
                backgroundColor: m.role!="user" ? "white" : "lightgreen"}}>{m.text}</Text>
        </View>
    </View>
)

const Icons={system:"adb", assistant:"ac-unit", user:"emoji-people"}