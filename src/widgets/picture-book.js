import React from "react"
import { Pressable, View, Image, ImageBackground, useWindowDimensions} from "react-native"
import * as ImagePicker from "expo-image-picker"
import * as ImageManipulator from "expo-image-manipulator"
import * as FileSystem from "expo-file-system"

import { ListMedia } from "./media"
import { selectBook } from "../store"
import { PlaySound, Recorder, PressableIcon } from "../components"
import { ManageList } from "./manage-list"
import { useDispatch } from "react-redux"

/**
 * some may not have audio, but the image is able to be shown
 */
export default class PictureBook extends ListMedia {
    static defaultProps = {
        ...super.defaultProps,
        id: "picturebook",
        slug: "picturebook",
        title: "Recognize your world",
        thumb: require("../../assets/widget-picture-book.jpeg"),
        description: "Recognize everything in your world",
        tags:["kitchen","food"],
        onRecordChunk({chunk, recognized}){
            if(chunk.text==recognized){
                dispatch({type:"challenge/remove", chunk})
            }else{
                dispatch({type:"challenge/add", chunk})
            }
        },
    }

    createTranscript(){
        const state=this.context.store.getState()
        this.tag=state.talks[this.props.id].tag
        const book=selectBook(state, this.slug, this.tag)
        book.reduce((cues,{duration=2000, ...cue},i)=>{
            const time=i==0 ? 0 : cues[i-1].end
            cues.push({time, end:time+duration+this.offsetTolerance, ...cue})
            return cues
        },this.cues)
    }

    componentDidUpdate(props, state){
        if(this.state.tag!=state.tag){
            this.doCreateTranscript()
        }
    }

    title(){
        return this.props.tag
    }

    render() {
        const { thumb, posterSource = thumb, source, title, ...props } = this.props
        return (
            <View {...props} style={{width:"100%",height:"100%",paddingTop:50, paddingBottom:50}}>
                {this.doRenderAt()}
            </View>
        )
    }

    renderAt({uri, audio}, i){ 
        const {rate, volume}=this.status
        return (
            <PlaySound {...{key:i, audio, rate, volume}}>
                <Image source={{uri}} style={{flex:1}}/>
            </PlaySound>
        )
    }

    static Shortcut=()=><PictureBook.TagShortcut slug={PictureBook.defaultProps.slug}/>

    static Tags=props=><ListMedia.Tags talk={PictureBook.defaultProps} placeholder="Tag: to categorize your picture book" {...props}/>
    static ManageList=({slug="picturebook"})=>{
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
            <ManageList 
                slug={slug}
                actions={<PressableIcon name="add-a-photo" 
                    onPress={e=>{
                        (async()=>{
                            const select=await ImagePicker.launchCameraAsync({...options,allowsEditing:true})
                            if(select.cancelled)
                                return 
                            const result=await resize(select)
                            dispatch({type:"picturebook/record", uri:result.uri})
                        })()
                    }}
                    onLongPress={e=>{
                        (async ()=>{
                            const select = await ImagePicker.launchImageLibraryAsync({...options,allowsMultipleSelection:true})
                            if(select.cancelled)
                                return 
                            select.selected.forEach(a=>{
                                (async ()=>{
                                    const result=await resize(a)
                                    dispatch({type:"picturebook/record", uri:result.uri})
                                })()
                            })
                        })();
                    }}/>}
                listProps={{
                    numColumns:2,
                    renderItem:({item,tag})=>(
                        <Pressable style={[{flex:1,flexDirection:"row", justifyContent:"center",paddingBottom:40},thumbStyle]}
                            onLongPress={e=>{
                                dispatch({type:`${slug}/remove`, uri:item.uri})
                            }}>
                            <ImageBackground source={item} style={{flex:1}}>
                                <PressableIcon name={item.tags?.includes(tag) ? "check-circle-outline" : "radio-button-unchecked"} 
                                    size={24} style={{position:"absolute",backgroundColor:"black",opacity:0.5}} color="white"
                                    onPress={e=>{
                                        if(tag){
                                            dispatch({type:`${slug}/tag`, uri:item.uri, tag})
                                        }
                                    }}/>
                                
                                <Recorder text={item.text} audio={item.audio} color="white"
                                    textStyle={{position:"absolute", bottom:-20, width:"100%", textAlign:"center"}}
                                    style={{position:"absolute",right:0,backgroundColor:"black",opacity:0.5}} size={40}
                                    onRecordUri={()=>`${FileSystem.documentDirectory}picturebook/${Date.now()}.wav`}
                                    onRecord={record=>dispatch({type:"picturebook/set",uri:item.uri, ...record})}
                                    />
                            </ImageBackground>
                        </Pressable>
                    ),
                }}
            />
        )
    }
}
