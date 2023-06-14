import React from "react"
import { View, Text, Pressable, Image, ImageBackground, useWindowDimensions, TextInput} from "react-native"
import * as ImagePicker from "expo-image-picker"
import * as ImageManipulator from "expo-image-manipulator"
import * as FileSystem from "expo-file-system"

import { TaggedListMedia } from "./media"
import { Loading, PressableIcon, Recognizer, Recorder, useStateAndLatest, useTalkQuery } from "../components"
import { TaggedTranscript } from "./tagged-transcript"
import { useDispatch, useSelector } from "react-redux"
import { isAdminLogin } from "../store"
import { useNavigate } from "react-router-native"

/**
 * some may not have audio, but the image is able to be shown
 * data:[{uri,text}]
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

        return (
            <TaggedTranscript {...props}
                actions={(tag,id)=>(<Uploader 
                        options={{
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            aspect: [1, 1],
                            quality: 0,
                        }} 
                        upload={async select=>{
                            const result=await ImageManipulator.manipulateAsync(select.uri,[{resize:{width:400}}], {compress:0,format:"jpeg"})
                            FileSystem.deleteAsync(select.uri,{idempotent:true})
                            dispatch({type:"talk/book/record", id, uri:result.uri, text:"Name"})
                        }}/>
                )}
                renderItem={PictureItem}
                listProps={{numColumns:2}}
            />
        )
    }

    static DailyPicture={
        id:"DailyPicture",
        slug: this.defaultProps.slug,
        title: "A Daily Picture",
        isWidget:true,
        api:"https://source.unsplash.com/random",
    }
}

function Uploader({options={mediaTypes: ImagePicker.MediaTypeOptions.Images}, upload, ...props}) {
    return <PressableIcon name="add-a-photo" {...props}
        onPress={e => {
            (async () => {
                const select = await ImagePicker.launchCameraAsync({allowsEditing: true, ...options })
                if (!select.cancelled) {
                    await upload(select)
                }
            })()
        } }
        onLongPress={e => {
            (async () => {
                const select = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, ...options })
                if (!select.cancelled) {
                    select.selected.forEach(upload)
                }
            })()
        } } />
}

export function DailyPicture({}){
    const {width, height}=useWindowDimensions()
    const {slug, id, api}=PictureBook.DailyPicture

    const {data:talk={}, isLoading} = useTalkQuery({api:"Qili", slug, id})
    const {
        posterSource=`${api}/${width}x${height}/?city,night`, 
        data=[]
    }=talk||{}
    
    const bAdmin=true//useSelector(isAdminLogin)
    const navigate=useNavigate()

    const [visible, setVisible]=React.useState(true)

    if(isLoading)
        return <Loading/>

    return (
        <View style={{flex:1}}>
            <ImageBackground source={{uri:posterSource}} style={{flex:1}} resizeMode="contain">
                {visible && data.map(a=><IdentifiedObject key={a.text} {...a}/>)}
                <Locator {...{x:width/2, y: (height-50)/2}}/>
            </ImageBackground>
            <View style={{height:50, flexDirection:"row", justifyContent:"space-around"}}>
                <PressableIcon name="apps" color={visible ? "yellow" : "gray"} onPress={e=>setVisible(!visible)}/>
                {!bAdmin ? <Text> </Text> :
                    <Uploader name="cloud-upload"
                        options={{
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            quality: 0.8
                        }}
                        upload={async select=>{
                            const result=await ImageManipulator.manipulateAsync(select.uri,[{rotate:90}], {compress:1,format:"png"})
                            FileSystem.deleteAsync(select.uri,{idempotent:true})
                            const posterSource=await Qili.upload({file:result.uri, key:`Widget/${PictureBook}/${new Date().asDateString()}.png`, host:`Widget:${PictureBook.DailyPicture.id}`})
                            const talk={...PictureBook.DailyPicture,  posterSource, }
                            await Qili.fetch({
                                id:"save", 
                                variables:{talk}
                            })
                            Qili.invalidate([{type:"Talk", id:PictureBook.DailyPicture.id}])
                        }}
                        /> 
                    
                }
                <PressableIcon name="read-more" onPress={e=>navigate(`/talk/picturebook/retelling/DailyPicture`)}/>
            </View>
        </View>
    )
}


import { Gesture, GestureDetector } from "react-native-gesture-handler"
function Locator({size=125, x:x0=0, y:y0=0, d=-size/2}){
    const [{x,y,dx=0,dy=0,width,height,scale}, setPosition, $position]=useStateAndLatest({x:x0+d,y:y0+d,width:size,height:size,scale:1})
    const dispatch=useDispatch()
    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            setPosition({...$position.current, scale:$position.current.scale*e.scale})
        })
    
    const panGesture=Gesture.Pan()
        .onUpdate(e=>{
            setPosition({
                ...$position.current, 
                dx:e.translationX,
                dy:e.translationY,
            }) 
        })
        .onEnd(e=>{
            const {x,y,dx,dy}=$position.current
            setPosition({
                ...$position.current,
                x:x+dx,y:y+dy,
                dx:undefined,
                dy:undefined
            })
        })
    const refEditor=React.useRef()
    return (
        <GestureDetector gesture={Gesture.Race(panGesture, pinchGesture)}>
            <View style={{ 
                    justifyContent:"center", alignContent:"center",
                    borderWidth:2, borderColor:"red",
                    position:"absolute", 
                    left:x+dx, top:y+dy,  width:width*scale, height:height*scale}}>
                <View style={{position:"absolute", bottom:0, left:0, flexDirection:"row"}}>
                    <TextInput ref={refEditor} textAlign="center"
                        style={{flex:1,height:20, marginLeft:2, marginRight:2, borderBottomWidth:2, borderColor:"yellow", color:"yellow"}}
                        onEndEditing={({nativeEvent:{text}})=>{
                            if(!text)
                                return 
                            const uri=`${parseInt(x+dx)},${parseInt(y+dy)},${parseInt(width*scale)},${parseInt(height*scale)}`
                            dispatch({type:"talk/book/record", id:PictureBook.DailyPicture.id, text, uri, talk:PictureBook.DailyPicture})
                            refEditor.current.clear()
                        }}
                    />
                    <PressableIcon 
                        color="yellow" name="check" style={{width:20}}
                        onPress={e=>refEditor.current.blur()}/>
                </View> 
            </View>
        </GestureDetector>
    )
}

function IdentifiedObject({uri,text}){
    const [,,left,top,width,height]=React.useMemo(()=>{
        const [x,y,width,height]=uri.split(",").map(a=>parseInt(a))
        return [x+width/2, y+height/2, x, y, width, height]
    },[uri])
    return (
        <View style={{
                position:"absolute",left,top, width, height, 
                borderWidth:1, 
                borderColor:"gray", 
                justifyContent:"center", alignItems:"center"
            }}>
            <Text textAlign="center">{text}</Text>
        </View>
    )
}