import React from "react"
import { Pressable, View, Image, ImageBackground, useWindowDimensions, TextInput} from "react-native"
import * as ImagePicker from "expo-image-picker"
import * as ImageManipulator from "expo-image-manipulator"
import * as FileSystem from "expo-file-system"

import { TaggedListMedia, TagShortcut, TagManagement } from "./media"
import { PlaySound, Recorder, PressableIcon } from "../components"
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
        title: "Recognize your world",
        thumb: require("../../assets/widget-picture-book.jpeg"),
        description: "Recognize everything in your world",
        tags:["kitchen","food"],
        /*
        onRecordChunk({chunk, recognized}){
            if(chunk.text==recognized){
                dispatch({type:"challenge/remove", chunk})
            }else{
                dispatch({type:"challenge/add", chunk})
            }
        },
        */
    }

    render() {
        const { thumb, posterSource = thumb, source, title, ...props } = this.props
        return (
            <View {...props} style={{width:"100%",height:"100%",paddingTop:50, paddingBottom:50}}>
                {this.doRenderAt()}
            </View>
        )
    }

    renderAt({uri}){ 
        return <Image source={{uri}} style={{flex:1}}/>
    }

    static Shortcut=()=><TagShortcut slug={PictureBook.defaultProps.slug}/>
    static TagManagement=props=><TagManagement talk={PictureBook.defaultProps} placeholder="Tag: to categorize your picture book" {...props}/>
    static TaggedTranscript=({slug=PictureBook.defaultProps.slug})=>{
        const dispatch=useDispatch()
        const {width}=useWindowDimensions()
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
            <TaggedTranscript 
                slug={slug}
                actions={tag=>{
                    const save=async select=>{
                        const result=await resize(select)
                        dispatch({type:"picturebook/record", uri:result.uri, tags:[tag], text:"Name"})
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
                listProps={{
                    numColumns:2,
                    renderItem:({item,tag})=>(
                        <Pressable style={[{flex:1,flexDirection:"row", justifyContent:"center",paddingBottom:40},thumbStyle]}
                            onLongPress={e=>{
                                dispatch({type:`${slug}/remove`, uri:item.uri})
                            }}>
                            <ImageBackground source={item} style={{flex:1}}>
                                <TextInput defaultValue={item.text} selectTextOnFocus={true}
                                    style={{position:"absolute",left:5, top: 5, 
                                        backgroundColor:"black",opacity:0.5,width:"80%",
                                        padding:2,color:"yellow",fontSize:20
                                    }}
                                    onEndEditing={({nativeEvent:{text}})=>{
                                        if(text!=item.text){
                                            dispatch({type:"picturebook/set",uri:item.uri, text})
                                        }
                                    }}/>
                            </ImageBackground>
                        </Pressable>
                    ),
                }}
            />
        )
    }
}