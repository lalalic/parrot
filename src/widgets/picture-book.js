import React from "react"
import { View, Text, Pressable, Image, ImageBackground, useWindowDimensions, TextInput} from "react-native"
import * as ImagePicker from "expo-image-picker"
import * as ImageManipulator from "expo-image-manipulator"
import * as FileSystem from "expo-file-system"

import { TaggedListMedia } from "./media"
import { Loading, PressableIcon, useStateAndLatest, useTalkQuery } from "../components"
import { TaggedTranscript } from "./tagged-transcript"
import { useDispatch, useSelector, } from "react-redux"
import { isAdminLogin, Qili } from "../store"
import { useNavigate } from "react-router-native"
import Chat from "./chat"

function isImageArea(uri){
    const parts=uri.split(",")
    return parts.length==4
}

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
        debugger
        if(isImageArea(uri)){
            debugger
            const {thumb}=this.props
            const [left,top,width,height]=uri.split(",").map(a=>parseInt(a))
            return (
                <View style={{flex:1, alignItems:"center", justifyContent:"center"}}>
                    <AreaImage src={thumb} size={200} area={{left,top,width,height}}/>
                </View>
            )
        }
        return <Image source={{uri}} style={{flex:1}}/>
    }

    createTranscript(){
        return [{uri:"0,0,500,500", text:"road"}, {uri:"0,0,1250,1250", text:"building"}]
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
                actions={(tag,id)=>([
                        <Uploader key="upload"
                            options={{
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                aspect: [1, 1],
                                quality: 0,
                            }} 
                            upload={async select=>{
                                const result=await ImageManipulator.manipulateAsync(select.uri,[{resize:{width:400}}], {compress:0,format:"jpeg"})
                                FileSystem.deleteAsync(select.uri,{idempotent:true})
                                dispatch({type:"talk/book/record", id, uri:result.uri, text:"Name"})
                            }}/>,
                        <Uploader name="apartment" key="objects"
                            options={{
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                allowsMultipleSelection:false,
                                quality: 0.8
                            }}
                            upload={async select=>{
                                if(select.width>select.height){
                                    const result=await ImageManipulator.manipulateAsync(select.uri,[{rotate:90}], {compress:1,format:"png"})
                                    await FileSystem.moveAsync({from:result.uri, to:path})
                                }
                                dispatch({type:"talk/set", talk:{id, thumb:result.uri, identfier:true}})
                            }}
                            onPress={e=>{

                            }}
                            />
                    ]
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
        isWidget:true
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

export function DailyPicture({}){
    const {width, height}=useWindowDimensions()
    const navigate=useNavigate()
    const dispatch=useDispatch()
    const today=new Date().asDateString()

    const {data:talk={}, isLoading} = useTalkQuery({api:"Qili", id:`DailyPicture/${today}`, slug:"Widget"})
    
    const bAdmin=useSelector(state=>isAdminLogin(state))
    
    const [{visible, random, source}, setState]=React.useReducer((state,action)=>{
        state={...state, ...action}
        if(action.source){
            state.visible=false
        }
        if(action.visible){
            state.source=""
        }
        return state
    },{visible:true, random:false, source:""})
    
    if(isLoading)
        return <Loading/>

    return (
        <View style={{flex:1}}>
            <ImageBackground source={{uri:source||talk.thumb}} style={{flex:1,resizeMode:"contain"}}>
                <IdentifiedObjects visible={visible} today={today} data={talk.data||[]}/>
                <Locator {...{x:width/2, y: (height-50)/2}} onLocate={async identified=>{
                    await Qili.fetch({
                        query:`mutation a($today:String!, $uri:String!, $text:String!){
                            identifiedInDailyPicture(today:$today, uri:$uri, text:$text)
                        }`,
                        variables:{today, ...identified}
                    })   
                }}/>
            </ImageBackground>
            <View style={{height:50, flexDirection:"row", justifyContent:"space-around"}}>
                <PressableIcon name="apps" color={visible ? "yellow" : "gray"} onPress={e=>setState({visible:!visible})}/>
                {!bAdmin ? <Text> </Text> :
                    [   <Uploader name="360"key="uploader"
                            options={{
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                allowsMultipleSelection:false,
                                quality: 0.8
                            }}
                            onPress={e=>setState({random:true})}

                            upload={async select=>{
                                let url=select.uri
                                setState({source:url})
                            }}
                        />,
                        <PressableIcon name="cloud-upload" key="test" color={!source ? "gray" : "white"}
                            onPress={e=>{
                                if(!source)
                                    return 
                                ;(async ()=>{
                                    let path=source
                                    if(path.startsWith("http")){
                                        path=`${FileSystem.documentDirectory}DailyPicture/${today}.png`
                                        await prepareFolder(path)
                                        await FileSystem.downloadAsync(source, path)
                                        const size=await new Promise((resolve)=>Image.getSize(path, (width,height)=>resolve({width,height})),e=>resolve({width:0,height:1}))
                                        if(size.width>size.height){
                                            const result=await ImageManipulator.manipulateAsync(path,[{rotate:90}], {compress:1,format:"png"})
                                            await FileSystem.moveAsync({from:result.uri, to:path})
                                        }
                                    }
                                    await Qili.upload({file:path, key:`Widget/DailyPicture/${today}.png`, host:`Widget:${PictureBook.DailyPicture.id}`})
                                    dispatch(Qili.util.invalidateTags([{type:"Talk", id:PictureBook.DailyPicture.id}]))
                                    setState({source:""})
                                })();
                            }}
                            />
                    ]
                    
                }
                <PressableIcon name="read-more" onPress={e=>navigate(`/talk/picturebook/retelling/DailyPicture`)}/>
            </View>
            {random && <Chat 
                prompt="response one or two words to describe a random scene with comma as seperator" 
                onSuccess={async ({message})=>{
                    const res=await fetch(`https://source.unsplash.com/random/${width}*${height-50}/?${message}`)
                    setState({random:false,source:res.url})
                }}
            />}
        </View>
    )
}

import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { prepareFolder } from "../experiment/mpeg"
function Locator({size=125, x:x0=0, y:y0=0, d=-size/2, onLocate}){
    const [{x,y,dx=0,dy=0,width,height,scale}, setPosition, $position]=useStateAndLatest({x:x0+d,y:y0+d,width:size,height:size,scale:1})
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
                borderWidth:1, 
                borderColor:"gray", 
                justifyContent:"center", alignItems:"center"
            }}>
            <Text textAlign="center">{text}</Text>
        </View>
    )
}

function IdentifiedObjects({visible, today, data=[]}){
    const [objects, setObjects]=React.useState([...data])
    React.useEffect(()=>{
        const unsub=Qili.subscribe({
            query:`subscription a($today:String!){
                newObjects:objectsInDailyPicture(today:$today)
            }`,
            variables:{today}
        },({newObjects=[]})=>{
            setObjects([...objects, ...newObjects])
        })
        return unsub
    },[])

    if(!visible)
        return null
    
    return <>{objects.map(a=><IdentifiedObject key={a.uri} {...a}/>)}</>
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