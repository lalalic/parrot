import React from "react"
import { View, Text, Pressable, Image, ImageBackground, useWindowDimensions, TextInput} from "react-native"
import * as ImagePicker from "expo-image-picker"
import * as ImageManipulator from "expo-image-manipulator"
import * as FileSystem from "expo-file-system"

import { TaggedListMedia, TagManagement } from "./media"
import { Loading, PressableIcon, useStateAndLatest, useTalkQuery, useAsk } from "../components"
import { TaggedTranscript } from "./tagged-transcript"
import { useDispatch, } from "react-redux"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
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

    renderAt({uri,text}){
        const {thumb}=this.props
        const [left,top,width,height]=uri.split(",").map(a=>parseInt(a))
        return (
            <View style={{flex:1, alignItems:"center", justifyContent:"center"}}>
                <AreaImage src={thumb} size={200} area={{left,top,width,height}}/>
            </View>
        )
    }

    static remoteSave=false
    
    static TaggedTranscript=props=>{
        const dispatch=useDispatch()
        const {width,height}=useWindowDimensions()

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

        const [visible, setVisible]=React.useState(true)

        const ask=useAsk("randomPicture","response one or two words to describe a random scene with comma as seperator")
        return (
            <TaggedTranscript {...props}
                actions={(tag,id)=>([
                        <PressableIcon name="apps" key="visible"
                            color={visible ? "yellow" : "gray"} 
                            onPress={e=>setVisible(!visible)}/>,

                        <Uploader name="360" key="objects"
                            options={{
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                allowsMultipleSelection:false,
                                quality: 0.8
                            }}
                            upload={async select=>{
                                let source=select.uri
                                const path=`${FileSystem.documentDirectory}${id}/thumb.png`
                                if(select.width>select.height){
                                    const result=await ImageManipulator.manipulateAsync(select.uri,[{rotate:90}], {compress:1,format:"png"})
                                    source=result.uri
                                    //await FileSystem.moveAsync({from:source.replace("file://",""), to:path.replace("file://","")})
                                }
                                
                                dispatch({type:"talk/set", talk:{id, thumb:source}})
                            }}
                            onPress={async e=>{
                                const words=(await ask()).toLowerCase()
                                const res=await fetch(`https://source.unsplash.com/random/${width}*${height-100}/?${words}`)
                                dispatch({type:"talk/set", talk:{id, thumb:res.url, tags:words.split(",")}})
                            }}
                            />
                    ]
                )}
                renderItem={PictureItem}
                listProps={{numColumns:2}}
            >
                <PictureIdentifier {...{
                    visible,
                    onLocate({uri,text}, id){
                        dispatch({type:"talk/book/record", id, uri, text})
                    },
                    locator:{size:150, x:width/2,y:100}
                }}/>
            </TaggedTranscript>
        )
    }

    static TagManagement({talk=this.defaultProps, placeholder=`recognize your world`, ...props}){
        const dispatch=useDispatch()
        const navigate=useNavigate()
        return (
            <View style={{flex:1}}>
                <TagManagement {...{
                    talk, placeholder,
                    ...props,
                    renderItemExtra({item}){
                        return ( 
                            <Pressable style={{width:50,height:50,borderWidth:1,borderColor:"lightgray"}}
                                onPress={e=>navigate(`/widget/${item.slug}/${item.id}`)}
                                >
                                {item.thumb && <Image source={{uri:item.thumb}} style={{width:"100%",height:"100%"}}/>}
                            </Pressable>
                        )
                    }
                    }}/>
                <View style={{height:50, flexDirection:"row", alignItems:"center", justifyContent:"center"}}>
                    <Uploader upload={async select=>{
                        let uuid=Date.now()
                        let source=select.uri
                        if(select.width>select.height){
                            const result=await ImageManipulator.manipulateAsync(select.uri,[{rotate:90}], {compress:1,format:"png"})
                            source=result.uri
                        }
                        PictureBook.create({thumb:source, title:`locale-${uuid++}`},dispatch)
                    }}/>
                </View>
            </View>
        )
    }

    static async onFavorite({id, talk, state, dispatch}){
        const slug=this.defaultProps.slug
        const file=talk.thumb
        if(file.startsWith("file://")){
            const url=await Qili.upload({file:talk.thumb, key:`${slug}/${id}/objects.png`})
            dispatch({type:"talk/set", talk:{id, thumb:url}})
            talk.thumb=url
        }
        return super.onFavorite(...arguments)
    }
}

function Uploader({options={mediaTypes: ImagePicker.MediaTypeOptions.Images}, upload=a=>a, ...props}) {
    return <PressableIcon name="add-a-photo"
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
                    if(select.selected){
                        select.selected.forEach(upload)
                    }else{
                        upload(select)
                    }
                }
            })()
        } } 
        {...props}
        />
}

function PictureIdentifier({id, visible, onLocate, locator, ...props}){
    const {data:talk={}, isLoading}=useTalkQuery({slug:PictureBook.defaultProps.slug, id})
    if(isLoading)
        return <Loading/>
    
    return (
        <ImageBackground source={{uri:talk.thumb}} style={{flex:1,resizeMode:"contain"}} {...props}>
            <IdentifiedObjects visible={visible} objects={talk.data}/>
            <Locator {...locator} onLocate={identified=>onLocate?.(identified, id)}/>
        </ImageBackground>
    )
}

function Locator({size=125, x:x0=0, y:y0=0, d=-size/2, onLocate}){
    const [{x,y,dx=0,dy=0,width,height,scale}, setPosition, $position]=useStateAndLatest({x:x0+d,y:y0+d,width:size,height:size,scale:1})
    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            setPosition({...$position.current, scale:e.scale})
        })
        .onEnd(e=>{
            const {width,height,scale}=$position.current
            setPosition({...$position.current, width:width*scale,height:height*scale,scale:1})
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
                <View style={{ bottom:0, left:0, flexDirection:"row"}}>
                    <TextInput ref={refEditor} textAlign="center"
                        style={{flex:1,height:20, marginLeft:2, marginRight:2, borderBottomWidth:2, borderColor:"yellow", color:"yellow"}}
                        onEndEditing={({nativeEvent:{text}})=>{
                            if(!text)
                                return 
                            const uri=`${parseInt(x+dx)},${parseInt(y+dy)},${parseInt(width*scale)},${parseInt(height*scale)}`
                            onLocate?.({text, uri})
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
                //borderWidth:1, 
                borderColor:"gray", 
                justifyContent:"center", 
                alignItems:"center",
            }}>
            <Text textAlign="center">{text}</Text>
        </View>
    )
}

function IdentifiedObjects({visible, objects}){
    if(!visible)
        return null
    
    return <>{(objects||[]).map(a=><IdentifiedObject key={a.uri} {...a}/>)}</>
}


function AreaImage({ src, size, area }){
    const [imageSize, setImageSize]=React.useState({width:100,height:100})

    React.useEffect(()=>{
        Image.getSize(src,(width,height)=>{
            setImageSize({width,height})
        })
    },[])

  const frameStyle = React.useMemo(()=>({
    width: size,
    height: size,
    overflow: 'hidden',
    position: 'relative',
  }),[size])

  const scale=size / area.width
  const croppedImageStyle = React.useMemo(()=>({
    height:"100%", width:"100%",
    ...imageSize,
    position: 'absolute',
    left: -(area.left * scale),
    top: -(area.top * scale),
    resizeMode: "contain",
    transform: [
        { scaleX:  scale},
        { scaleY: scale },
    ],
  }),[imageSize, area, size])

  return (
    <View style={frameStyle}>
      <Image source={{ uri: src }} style={croppedImageStyle} />
    </View>
  );
}