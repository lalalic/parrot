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
    const [source, setSource]=React.useState(Image.resolveAssetSource(require("../assets/coolface.usdz")))
    const [leftEye, setLeftEye]=React.useState({})
    return (
        <View style={{flex:1, backgroundColor:"red"}}>
            <View style={{flexDirection:"row", justifyContent:"space-around"}}>
                <PressableIcon name="airplay" label="mesh"
                    onPress={async e=>{
                        setSource({mesh:{fillMesh:true, fillMode: 1}})
                    }}/>
                <PressableIcon name="airplay" label="fillMode"
                    onPress={async e=>{
                        setLeftEye(Image.resolveAssetSource(require("../assets/widget-audio-book.jpeg")))
                    }}/>
                <PressableIcon name="airplay" 
                    onPress={async e=>{
                        const {uri} =await DocumentPicker.getDocumentAsync({copyToCacheDirectory:true})
                        setSource({uri})
                    }}/>
            </View>
            <ARMotion style={{flex:1, flexGrow:1}}
                createItem={face=>{
                    return React.cloneElement(face,{
                        source,
                        leftEye,
                        rightEye: Image.resolveAssetSource(require("../assets/icon.png")),
                        mouth: Image.resolveAssetSource(require("../assets/widget-picture-book.jpeg")),
                    })
                }}
                />
        </View>
    )
}