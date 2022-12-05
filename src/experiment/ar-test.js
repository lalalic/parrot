import React from "react"
import { View, Text, Image} from "react-native"
//import {ARFaceMotionView as ARFaceMotion} from "react-native-armotion"
import { ARMotion } from "./ar"
import {PressableIcon} from "../components"
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from "expo-file-system"


import {ViroARScene, ViroText, ViroARSceneNavigator, Viro3DObject, ViroVideo} from "@viro-community/react-viro"
const InitialScene=()=>(
    <ViroARScene>
        <ViroText text="Happy Birthday, Maggie!" 
            position={[-2,0.5,-5]}
            style={{fontSize:10, color: "red"}}
            />
    
        <Viro3DObject
            source={require("../../assets/LadyCat.obj")}
            resources={[
                require("../../assets/LadyCat.mtl"),
                require("../../assets/LadyCat.bmp"),
                require("../../assets/LadyCat.fbx"),
            ]}
            position={[0,-1,-2]}
            scale={[0.05, 0.05, 0.05]}
            rotation={[0, 0, 0]}
            type="OBJ"
        />

        <ViroVideo 
            source={{uri:`${FileSystem.documentDirectory}/99617/video.mp4`}}
            loop={true}
            position={[0,1, -5]}
            scale={[2, 2, 0]}/>

    </ViroARScene>
)
export function scene(){
    return (
        <ViroARSceneNavigator 
            styles={{flex:1}}
            initialScene={{
                scene:InitialScene
            }}>

        </ViroARSceneNavigator>
    )
}


export default function AR(){
    const [source, setSource]=React.useReducer((state,action)=>{
        if(action.uri)
            return action
        return {...state, mesh:{...state.mesh, ...action}}
    },{mesh:{fillMesh:false, fillMode:0}})
    const [background, setBackground]=React.useState("h")
    return (
        <View style={{flex:1, backgroundColor:"red"}}>
            <View style={{flexDirection:"row", justifyContent:"space-around"}}>
                <PressableIcon name="airplay" label="Fill Mesh"
                    onPress={async e=>{
                        setSource({fillMesh:!source.mesh?.fillMesh})
                    }}/>
                <PressableIcon name="airplay" label="Fill Mode"
                    onPress={async e=>{
                        setSource({fillMode:!source.mesh?.fillMode})
                    }}/>
                <PressableIcon name="airplay" label="Face"
                    onPress={async e=>{
                        setSource(Image.resolveAssetSource(require("../../assets/face.scn")))
                    }}/>
                <PressableIcon name="airplay" label="Background"
                    onPress={async e=>{
                        setBackground(!background)
                    }}/>
            </View>
            <ARMotion style={{flex:1, flexGrow:1, backgroundColor:"none"}} 
                background={background}
                verticeTextFilter={[3]}
                createItem={face=>{
                    return React.cloneElement(face,{
                        source,
                        onSmile:e=>console.log("smiling"),
                        rightEye: Image.resolveAssetSource(require("../../assets/icon.png")),
                        mouth: Image.resolveAssetSource(require("../../assets/widget-picture-book.jpeg")),
                    })
                }}
                />
        </View>
    )
}