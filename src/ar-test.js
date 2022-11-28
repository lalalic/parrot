import React from "react"
import { View, Text, Image} from "react-native"
//import {ARFaceMotionView as ARFaceMotion} from "react-native-armotion"
import { ARMotion } from "./ar"
import {PressableIcon} from "./components"
import * as DocumentPicker from 'expo-document-picker';

/*
import {ViroARScene, ViroText, ViroARSceneNavigator} from "@viro-community/react-viro"
const InitialScene=()=>(
    <ViroARScene>
        <ViroText text="Happy Birthday, Maggie!" 
            position={[0,0,0]}
            style={{fontSize:30}}
            />
    </ViroARScene>
)
export default ()=>(
    <ViroARSceneNavigator 
        styles={{flex:1}}
        initialScene={{
            scene:InitialScene
        }}
    >

    </ViroARSceneNavigator>
)
*/


export default function AR(){
    const [leftEye, setLeftEye]=React.useState(Image.resolveAssetSource(require("../assets/widget-audio-book.jpeg")))


    return (
        <View style={{flex:1, backgroundColor:"red"}}>
            <Text>Hello</Text>
            <PressableIcon name="airplay" 
                onPress={async e=>{
                    const {uri} =await DocumentPicker.getDocumentAsync()
                    setLeftEye({uri})
                }}/>
            <ARMotion style={{flex:1, flexGrow:1}}
                createItem={face=>{
                    return React.cloneElement(face,{
                        source : {mesh:{fillMesh:false, fillMode: 0}},
                        leftEye,
                        rightEye: Image.resolveAssetSource(require("../assets/icon.png")),
                        mouth: Image.resolveAssetSource(require("../assets/widget-picture-book.jpeg")),
                    })
                }}
                />
        </View>
    )
}