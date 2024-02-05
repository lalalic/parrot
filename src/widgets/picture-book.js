import React from "react"
import { View, Text, Pressable, Image, useWindowDimensions, Alert} from "react-native"
import * as ImagePicker from "expo-image-picker"
import * as ImageManipulator from "expo-image-manipulator"

import { TaggedListMedia, TagManagement } from "./media"
import { useTalkQuery } from "../components"
import { ColorScheme } from "react-native-use-qili/components/default-style"
import PressableIcon from "react-native-use-qili/components/PressableIcon"
import Loading from "react-native-use-qili/components/Loading"
import useAsk from "react-native-use-qili/components/useAsk"
import { TaggedTranscript } from "./tagged-transcript"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-native"
import ImageCropper from "../components/image-cropper"
import { Speak } from "../components"
const l10n=global.l10n

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
    
    static TaggedTranscript=({id, ...props})=>{
        const color=React.useContext(ColorScheme)
        const dispatch=useDispatch()
        const {width,height}=useWindowDimensions()

        const PictureItem=React.useCallback(({item:{uri, text}, index, id, isActive, setActive})=>{
            const [playing, setPlaying] = React.useState(false)
            const textStyle={color: playing ? color.primary : color.text}
            
            return (
                <View style={{ flexDirection: "row", height: 50, backgroundColor: isActive ? 'skyblue' : 'transparent', borderRadius:5,}}>
                    <PressableIcon  name={playing ? "pause-circle-outline" : "play-circle-outline"} 
                        onPress={e=>setPlaying(!playing)}/>
                    <Pressable 
                        onPress={e=>setActive(isActive ? -1 : index)}
                        style={{ justifyContent: "center", marginLeft: 10, flexGrow: 1, flex: 1 }}>
                            <Text style={textStyle}>{text}</Text>
                            {playing && <Speak text={text} onEnd={e=>setPlaying(false)}/>}
                    </Pressable>
                    <PressableIcon name="remove-circle-outline" 
                        onPress={e=>dispatch({type:"talk/book/remove/index", index, id})}/>
                </View>
            )
        },[])

        const hasData=useSelector(({talks})=>!!talks[id].data?.length)

        const [visible, setVisible]=React.useState(true)

        const ask=useAsk({id:"randomPicture", timeout:2*60*1000 })

        return (
            <TaggedTranscript {...props} id={id}
                actions={[
                    hasData && <PressableIcon name="apps" key="visible"
                        color={visible ? "yellow" : "gray"} 
                        onPress={e=>setVisible(!visible)}/>,

                    !hasData && <PressableIcon name="auto-fix-high" key="auto" 
                        requireLogin="generate a scenario picture"
                        onPress={async e=>{
                            const words=await ask({message:"response one or two words to describe a random scene with comma as seperator", })
                            const res=await fetch(`https://source.unsplash.com/random/${width}*${height-100}/?${words}`)
                            dispatch({type:"talk/set", talk:{id, thumb:res.url, tags:words.split(",")}})
                        }}
                        />,
                    
                    !hasData && <Uploader name="camera-alt"
                        allowsMultipleSelection={false}
                        upload={async select=>{
                            const source=await (async ()=>{
                                if(select.width>select.height){
                                    const result=await ImageManipulator.manipulateAsync(select.uri,[{rotate:90}], {compress:1,format:"png"})
                                    return result.uri
                                }
                                return select.uri
                            })();
                            dispatch({type:"talk/set", talk:{id, thumb: source}})
                        }}/>
                ]}
                renderItem={PictureItem}

                editor={!visible ? {
                    placeholder: l10n["Change object name"],
                    onChange(text, i, {uri}){
                        dispatch({type:"talk/book/set", id, uri, text})
                    },
                    getItemText({text}){
                        return text
                    }
                } : undefined}
            >
                {visible && <PictureIdentifier {...{
                        visible:true,
                        onLocate({rect:{x,y,width,height}, ...identified}){
                            dispatch({type:"talk/book/record", ...identified, uri:`${x},${y},${width},${height}`})
                        },
                        viewerSize:200,
                    }}/>
                }
            </TaggedTranscript>
        )
    }

    static TagManagement({talk=this.defaultProps, ...props}){
        const dispatch=useDispatch()
        const navigate=useNavigate()
        return (
            <View style={{flex:1}}>
                <TagManagement {...{
                    talk, 
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
                        PictureBook.create({thumb:source, title:`local-${uuid++}`},dispatch)
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

function Uploader({options={mediaTypes: ImagePicker.MediaTypeOptions.Images}, upload=a=>a, allowsMultipleSelection=true, ...props}) {
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
                const select = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection, ...options })
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

function PictureIdentifier({id, visible, onLocate, locator, search:q, ...props}){
    const {data:talk={}, isLoading}=useTalkQuery({slug:PictureBook.defaultProps.slug, id})
    const objects=React.useMemo(()=>talk.data.filter(a=>!q || a.text.indexOf(q)!=-1),[talk.data, q])
    if(isLoading)
        return <Loading/>
    
    return (
        <ImageCropper source={{uri:talk.thumb}} 
            style={{flex:1}}
            viewerSize={150} 
            onCrop={identified=>onLocate?.({...identified, id})}
            {...props}>
            <IdentifiedObjects visible={visible} objects={objects}/>
        </ImageCropper>
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
                //borderColor:"gray", 
                justifyContent:"center", 
                alignItems:"center",
            }} pointerEvents="none">
            <Text textAlign="center" 
                style={{color:"white",fontSize:20,backgroundColor:"black",opacity:0.8}}>
                {text}
            </Text>
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

    const scale=size / area.width
  
  const frameStyle = React.useMemo(()=>({
    width: size,
    height: size,
    overflow: 'hidden',
  }),[size])
  return (
    <View style={frameStyle}>
        <Image source={{ uri: src }} style={{
            ...imageSize,
            transform:[
                { translateX: -imageSize.width*(1-scale)/2 - area.left*scale},
                { translateY: - imageSize.height*(1-scale)/2 - area.top*scale},
                { scale:  scale},
            ]
        }} />
    </View>
  );
}