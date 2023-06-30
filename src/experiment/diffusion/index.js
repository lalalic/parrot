import React from "react"
import { Button, View, TextInput, Image } from "react-native"
import { PressableIcon } from "../../components"

import {Provider, useDiffusion} from "./provider"


export default function HuggingFace(){
    return (
        <Provider debug={true}>
            <Test/>
        </Provider>
    )
}

function Test(){
    const refInput=React.useRef()
    const {service}=useDiffusion()
    const [prompt, setPrompt]=React.useState("")
    const [images, setImages]=React.useState([])
    const imageStyle={width:150, height:150, padding:10, backgroundColor:"white", marginBottom:20}
    return (
        <View style={{flex:1, alignItems:"center"}}>
            <View style={{height:100, marginTop:50,marginBottom:50, flexDirection:"row", justifyContent:"center"}}>
                <TextInput ref={refInput}
                    multiline={true}
                    style={{padding:5, flexGrow:1, border:1, backgroundColor:"gray"}}
                    onKeyPress={e=>{
                        if(e.nativeEvent.key=="Enter"){
                            refInput.current.blur()
                        }
                    }}
                    onBlur={({nativeEvent:{text}})=>{
                        setPrompt(text)
                    }}
                    onEndEditing={({nativeEvent:{text}})=>{
                        setPrompt(text)
                    }}>

                    </TextInput>
                <View style={{width:100, justifyContent:"center"}}>
                    <PressableIcon name="brunch-dining" 
                        onPress={e=>{
                            refInput.current?.blur()
                            return new Promise((resolve,reject)=>{
                                setTimeout(()=>{
                                    prompt && service.generate(prompt).then(setImages).then(resolve,reject)
                                },0)
                            })
                        }}
                        />
                </View>
            </View>
            <View style={{
                flexGrow:1, 
                flexDirection:"row", flexWrap:'wrap', 
                alignContent:"flex-start",
                justifyContent:"space-around"}}>
                {images.map((uri,i)=><Image key={i} source={{uri}} style={imageStyle}/>)}
            </View>
        </View>
    )
}