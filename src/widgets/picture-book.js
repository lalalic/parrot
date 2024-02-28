import React from "react"
import { View, Text, Pressable, Image, useWindowDimensions, Dimensions} from "react-native"
import * as ImagePicker from "expo-image-picker"
import * as ImageManipulator from "expo-image-manipulator"

import { TaggedListMedia } from "./media"
import TagManagement from "./management/TagManagement"
import { useTalkQuery } from "../components"
import { ColorScheme } from "react-native-use-qili/components/default-style"
import PressableIcon from "react-native-use-qili/components/PressableIcon"
import Loading from "react-native-use-qili/components/Loading"
import useAsk from "react-native-use-qili/components/useAsk"
import { TaggedTranscript, clean, getItemText, Delay } from "./management/tagged-transcript"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-native"
import ImageCropper from "../components/image-cropper"
import { Speak } from "../components"
const l10n=global.l10n

/**
 * some may not have audio, but the image is able to be shown
 * data:[{uri,text, pronunciation, translated}]
 */
export default class PictureBook extends TaggedListMedia {
    static defaultProps = {
        ...super.defaultProps,
        id: "picturebook",
        slug: "picturebook",
        title: "Picture Book",
        /**
         * thumb will be image src for individual picture
         */
        thumb: require("../../assets/widget-picture-book.png"),
        description: "Recognize everything in your world",
        shadowing:{visible:true, captionDelay:1},
        miniPlayer:false
    }

    createTranscript(){
        const {data=[]}=this.props
        return data.map(({uri, text},i)=>({
            text: "",
            test: text,
            uri,
            fulltext:getItemText(data[i], true, "\n\n")
        }))
    }

    renderAt({test, uri, fulltext, image}){
        const { thumb, policy, whitespacing}=this.props
        const [left,top,width,height]=uri.split(",").map(a=>parseInt(a))
        const title= policy.fullscreen ? fulltext : test
        return (
            <View style={{flex:1, alignItems:"center", justifyContent:"center", paddingTop: 20}}>
                <AreaImage src={image||thumb} size={200} area={{left,top,width,height}}/>
                <View style={{width:"100%", position:"absolute", top:0, left:0}}>
                    <Text style={{color:"white", textAlign:"center", fontSize:20}}>
                        {!!whitespacing && !!policy.caption && <Delay seconds={policy.captionDelay}>{title}</Delay>}
                    </Text>
                </View>
            </View>
        )
    }

    static onLongMemoryData(newData, srcTalk){
        return newData.map(a=>({...a, image:srcTalk.thumb}))
    }

    static remoteSave=false
    
    static TaggedTranscript=({id, ...props})=>{
        const color=React.useContext(ColorScheme)
        const dispatch=useDispatch()
        const {width,height}=useWindowDimensions()

        const PictureItem=React.useCallback(({item, text=item.text, index, id, isActive, setActive})=>{
            const [playing, setPlaying] = React.useState(false)
            const textStyle={color: playing ? color.primary : color.text}
            
            return (
                <View style={{ flexDirection: "row", height: 50, backgroundColor: isActive ? 'skyblue' : 'transparent', borderRadius:5,}}>
                    <PressableIcon  name={playing ? "pause-circle-outline" : "play-circle-outline"} 
                        onPress={e=>setPlaying(!playing)}/>
                    <Pressable 
                        onPress={e=>setActive(isActive ? -1 : index)}
                        style={{ justifyContent: "center", marginLeft: 10, flexGrow: 1, flex: 1 }}>
                            <Text style={textStyle}>{React.useMemo(()=>getItemText(item),[item])}</Text>
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
                        label={l10n["List"]} labelFade={true}
                        color={visible ? "yellow" : "gray"} 
                        onPress={e=>setVisible(!visible)}/>,
                    
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
                        const [item]=PictureBook.parse(text)
                        dispatch({type:"talk/book/set", id, uri, ...item})
                    },
                    getItemText,
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

    static prompts=[{
        label:"random picture", name:"auto-fix-high",
        prompt(){
            return "response one or two words to describe a random scene with comma as seperator"
        },
        async onSuccess({response: title, store}){
            const {width,height}=Dimensions.get('window')
            const {my:{lang, mylang}}=store.getState()
            const res=await fetch(`https://source.unsplash.com/random/${width}*${height-100}/?${title}`)
            const id=PictureBook.create({title,thumb:res.url,tags:title.split(","), lang, mylang}, store.dispatch)
            return `${amount} ${category} Vocabulary save to @#${id}`
        }
    }]


    static parse(input){
        return input.split(/[\n;]/).filter(a=>!!a)
            .map(a=>{
                let pronunciation, translated;
                a=a.replace(/\[(?<pronunciation>.*)\]/,(a,p1)=>{
                    pronunciation=p1.trim()
                    return ""
                }).trim();
                a=a.replace(/[\(（](?<translated>.*)[\)）]/,(a,p1)=>{
                    translated=p1.trim()
                    return ""
                }).trim()
                if(a){
                    return clean({text:a, pronunciation, translated})
                }
            }).filter(a=>!!a)
    }


    static TagManagement({talk=this.defaultProps, ...props}){
        const dispatch=useDispatch()
        const navigate=useNavigate()
        return (
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
                },

                actions:(<Uploader upload={async select=>{
                        let uuid=Date.now()
                        let source=select.uri
                        if(select.width>select.height){
                            const result=await ImageManipulator.manipulateAsync(select.uri,[{rotate:90}], {compress:1,format:"png"})
                            source=result.uri
                        }
                        PictureBook.create({thumb:source, title:`local-${uuid++}`},dispatch)
                    }}/>)
                }}/>
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