import React from "react"
import { View, Text, Image} from "react-native"
//import {ARFaceMotionView as ARFaceMotion} from "react-native-armotion"
import { ARMotion } from "./ar"
import {PressableIcon} from "../components"
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from "expo-file-system"

/*
import {ViroARScene, ViroText, ViroARSceneNavigator, Viro3DObject, ViroVideo} from "@viro-community/react-viro"
const InitialScene=()=>(
    <ViroARScene>
        <ViroText text="Happy Birthday, Maggie!" 
            position={[0,0,0]}
            style={{fontSize:10, color: "red"}}
            />
        <Viro3DObject
            source={require("../../assets/LadyCat.obj")}
            position={[1,0,0]}
            scale={[0.05, 0.05, 0.05]}
            rotation={[0, 0, 0]}
            type="OBJ"
        />
        <ViroVideo 
        source={{uri:`${FileSystem.documentDirectory}/1737/video.mp4`}}
            loop={true}
            position={[0,2,-5]}
            scale={[2, 2, 0]}/>

    </ViroARScene>
)
export default ()=>(
    <ViroARSceneNavigator 
        styles={{flex:1}}
        initialScene={{
            scene:InitialScene
        }}>

    </ViroARSceneNavigator>
)
*/



export default function AR(){
    const [source, setSource]=React.useState(Image.resolveAssetSource(require("../../assets/face.scn")))
    const [leftEye, setLeftEye]=React.useState({})
    const [background, setBackground]=React.useState("h")
    return (
        <View style={{flex:1, backgroundColor:"red"}}>
            <View style={{flexDirection:"row", justifyContent:"space-around"}}>
                <PressableIcon name="airplay" label="mesh"
                    onPress={async e=>{
                        setSource({mesh:{fillMesh:true, fillMode: 1}})
                    }}/>
                <PressableIcon name="airplay" label="fillMode"
                    onPress={async e=>{
                        setLeftEye(Image.resolveAssetSource(require("../../assets/widget-audio-book.jpeg")))
                    }}/>
                <PressableIcon name="airplay" 
                    onPress={async e=>{
                        //const {uri} =await DocumentPicker.getDocumentAsync({copyToCacheDirectory:true})
                        //setSource({uri})
                        setBackground(!background)
                    }}/>
            </View>
            <ARMotion style={{flex:1, flexGrow:1}} 
                background={background}
                verticeTextFilter={[3]}
                createItem={face=>{
                    return React.cloneElement(face,{
                        source,
                        leftEye,
                        rightEye: Image.resolveAssetSource(require("../../assets/icon.png")),
                        mouth: Image.resolveAssetSource(require("../../assets/widget-picture-book.jpeg")),
                    })
                }}
                />
        </View>
    )
}