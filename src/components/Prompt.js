import React from 'react';
import { View, Text, Modal, TextInput } from "react-native";
import PressableIcon from "react-native-use-qili/components/PressableIcon";

export function Prompt({ }) {
    const [text, setText] = React.useState("")
    const [title, setTitle] = React.useState("")
    const [inputProps, setInputProps]= React.useState({})

    const promptPromoise=React.useRef(null)
    const prompt=React.useCallback((title, props={})=>{
        setTitle(title)
        setInputProps(props)

        let resolve=null
        promptPromoise.current=new Promise(res=>resolve=res)
        promptPromoise.current.resolve=resolve
        return promptPromoise.current
    },[]) 


    React.useEffect(()=>{
        globalThis.prompt=prompt
    },[prompt])
    return (
        <Modal visible={!!title} animationType="slide" transparent={true}>
            <View style={{ width: "100%", flex: 1, justifyContent: 'center' }}>
                <View style={{ backgroundColor: "white", padding: 40 }}>
                    <View style={{ height: 80, flexDirection: "column" }}>
                        <Text style={{ fontSize: 20, flex: 1, color: "black" }}>{title}</Text>
                        <TextInput 
                            style={{ borderBottomWidth: 1, borderColor: "gray", flex: 1, padding: 2 }}
                            {...inputProps}
                            value={text}
                            onChangeText={value => setText(value)} />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingTop: 20 }}>
                        <PressableIcon name="check" onPress={e =>{
                            setTitle("")
                            promptPromoise.current.resolve(text.trim())
                            promptPromoise.current=null
                            setText("")
                        }} />
                        <PressableIcon name="clear" onPress={e =>{
                            setTitle("")
                            promptPromoise.current.resolve("")
                            promptPromoise.current=null
                            setText("")
                        }} />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

export function prompt(title, props){
    return globalThis.prompt(...arguments)
}
