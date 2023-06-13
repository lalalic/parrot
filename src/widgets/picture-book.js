import React from "react"
import { Pressable, Image, ImageBackground, useWindowDimensions, TextInput} from "react-native"
import * as ImagePicker from "expo-image-picker"
import * as ImageManipulator from "expo-image-manipulator"
import * as FileSystem from "expo-file-system"

import { TaggedListMedia } from "./media"
import { PressableIcon } from "../components"
import { TaggedTranscript } from "./tagged-transcript"
import { useDispatch } from "react-redux"

/**
 * some may not have audio, but the image is able to be shown
 */
export default class PictureBook extends TaggedListMedia {
    static defaultProps = {
        ...super.defaultProps,
        id: "picturebook",
        slug: "picturebook",
        title: "Picture Book",
        thumb: require("../../assets/widget-picture-book.png"),
        description: "Recognize everything in your world",
        shadowing:{visible:true},
        dictating:{visible:true},
        retelling:{visible:true},
        miniPlayer:false
    }

    renderAt({uri}){ 
        return <Image source={{uri}} style={{flex:1}}/>
    }

    static remoteSave=false
    
    static TaggedTranscript=props=>{
        const dispatch=useDispatch()
        const {width}=useWindowDimensions()

        const PictureItem=React.useCallback(({item:{uri, text}, id})=>{
            return (
                <Pressable key={uri} style={[{flex:1,flexDirection:"row", justifyContent:"center",paddingBottom:40},thumbStyle]}
                    onLongPress={e=>dispatch({type:`talk/book/remove`,id, uri})}>
                    <ImageBackground source={{uri}} style={{flex:1}}>
                        <TextInput defaultValue={text} selectTextOnFocus={true}
                            style={{position:"absolute",left:5, top: 5, 
                                backgroundColor:"black",opacity:0.5,width:"80%",
                                padding:2,color:"yellow",fontSize:20
                            }}
                            onEndEditing={({nativeEvent:e})=>{
                                if(text!=e.text){
                                    dispatch({type:`talk/book/set`, id, uri, text:e.text})
                                }
                            }}/>
                    </ImageBackground>
                </Pressable>
            )
        },[])
        const thumbStyle={flex:1,height:width/2, padding:10}
        const options={
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            aspect: [1, 1],
            quality: 0,
        }
        const actions=[{resize:{width:400}}]
        const saveOptions={compress:0,format:"jpeg"}
        const resize=React.useCallback(async (select)=>{
            const result=await ImageManipulator.manipulateAsync(select.uri,actions, saveOptions)
            FileSystem.deleteAsync(select.uri,{idempotent:true})
            return result
        },[])
        return (
            <TaggedTranscript {...props}
                actions={(tag,id)=>{
                    const save=async select=>{
                        const result=await resize(select)
                        dispatch({type:"talk/book/record", id, uri:result.uri, text:"Name"})
                    }
                    return <PressableIcon name="add-a-photo" 
                        onPress={e=>{
                            (async()=>{
                                const select=await ImagePicker.launchCameraAsync({...options,allowsEditing:true})
                                if(!select.cancelled){
                                    await save(select)
                                }
                            })()
                        }}
                        onLongPress={e=>{
                            (async ()=>{
                                const select = await ImagePicker.launchImageLibraryAsync({...options,allowsMultipleSelection:true})
                                if(!select.cancelled){ 
                                    select.selected.forEach(save)
                                }
                            })();
                        }}/>
                }}
                renderItem={PictureItem}
                listProps={{numColumns:2}}
            />
        )
    }
}