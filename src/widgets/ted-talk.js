import React from "react"
import { Audio , Video as ExpoVideo} from "expo-av"
import { Text, ScrollView } from "react-native";
import * as Print from "expo-print";
import * as FileSystem from 'expo-file-system';
import { useNavigate} from "react-router-native"
import { useDispatch} from "react-redux"
import PressableIcon from "react-native-use-qili/components/PressableIcon";
import prepareFolder from "react-native-use-qili/components/prepareFolder";
import FlyMessage from "react-native-use-qili/components/FlyMessage";
import {isAdmin} from "react-native-use-qili/store";

import { PolicyChoice, html } from '../components';
import ClearAction from '../components/ClearAction';
import { Subtitles } from "../components/player"
import mpegKit from "../experiment/mpeg"
import { Qili, Ted, } from "../store";
const l10n=globalThis.l10n


export default class TedTalk extends React.Component{
    static Actions({talk, policyName, dispatch, navigate, slug=talk.slug, favorited=talk.favorited}){
        const hasTranscript = !!talk.data;
        const margins = { right: 100, left: 20, top: 20, bottom: 20 };
        return (
            <PolicyChoice label={true} labelFade={true} value={policyName}
                excludes={!hasTranscript ? ["shadowing","dictating","retelling"] : []}
                onValueChange={policyName => navigate(`/talk/${slug}/${policyName}/${talk.id}`, { replace: true })}>
                <RemoveRemote {...{talk, policyName}}/>
                {hasTranscript && <PressableIcon name="print"
                    onLongPress={async()=>await Print.printAsync({ html: html(talk, 130, margins, true), margins })}
                    onPress={async (e) =>await Print.printAsync({ html: html(talk, 130, margins, false), margins })} 
                />}

                {talk.hasLocal && <ClearAction {...{talk, policyName}}/>}

                {hasTranscript&&<PressableIcon name={favorited ? "favorite" : "favorite-outline"}
                    onPress={async (e) =>dispatch({type:"talk/toggle/favorited", talk})}
                    onLongPress={()=> dispatch({type:"talk/remote/favorited", talk})}
                    />}
            </PolicyChoice>
        )
    }

    static Info({talk, policyName, dispatch, navigate, style}){
        switch (policyName) {
            case "general":
                return (
                    <ScrollView style={style}>
                        <Text style={{fontSize:20}}>{talk.title}</Text>
                        <Text>{talk.description}</Text>
                    </ScrollView>
                )
            default: 
                return <Subtitles {...{ policy: policyName, style }} />;
        }
    }

    static mediaProps({autoplay, talk, dispatch, policyName, id=talk.id}){
        const Video=this.Video
        return {
            media: <Video
                posterSource={{ uri: talk.thumb }}
                source={{ uri: talk.video }}
                shouldPlay={autoplay}
                useNativeControls={false}
                style={{ flex: 1 }} />,
            transcript:talk.data
        }
    }

    static Video=React.forwardRef(({policy, whitespacing, onPlaybackStatusUpdate, ...props},ref)=>{
        return (
            <TedTalk {...{onPlaybackStatusUpdate, policy, whitespacing}} >
                <ExpoVideo 
                    shouldCorrectPitch={true}
                    pitchCorrectionQuality={Audio.PitchCorrectionQuality.High}
                    progressUpdateIntervalMillis={100}
                    onPlaybackStatusUpdate={onPlaybackStatusUpdate}
                    {...props} 
                    ref={ref}/>
            </TedTalk>
        )
    })

    static async onFavorite({id, talk, state, dispatch}){
        if(!Ted.supportLocal(talk))
			return
        
        if(Qili.isUploaded(talk.video))
            return 
        
        const {lang, mylang}=state.my
        const file=`${FileSystem.documentDirectory}${id}/video.mp4`
        FlyMessage.show(l10n["Downloading..."])
        await prepareFolder(file)
        FlyMessage.show(l10n["Generating audio..."])
        await mpegKit.generateAudio({source:talk.video, target:file})
        FlyMessage.show(`Generated audio, uploading to qili2...`)
        
        dispatch({type:"talk/set", talk:{id, localVideo:file}})

        const url=await Qili.upload({file, host:`Talk:${id}`, key:`Talk/${id}/video.mp4`}, state.my.admin)

        FlyMessage.show(`Uploaded, cloning talk...`)

        await Qili.fetch({
            id:"save",
            variables:{
                talk:{
                    ...talk, 
                    video:url,
                    lang,
                    mylang,
                }
            }
        }, state.my.admin)

        dispatch({type:"talk/set", talk:{id, localVideo:file, video:url}})

        FlyMessage.show(`Cloned to server`)
    }

    render(){
        const {children}=this.props
        return children
    }
}

function RemoveRemote({talk}){
    const navigate=useNavigate()
    const dispatch=useDispatch()
    const [bAdmin, setAdmin]=React.useState(false)
    const [isRemote, setRemote]=React.useState()

    React.useEffect(()=>{
        setRemote(talk.video?.indexOf("qili.com")!=-1)
    },[talk.video])

    React.useEffect(()=>{
        isAdmin().then(be=>setAdmin(be))
    },[])

    if(!isRemote || !bAdmin)
        return null

    return <PressableIcon name="remove-circle"
        onPress={e=>{
            dispatch(Qili.endpoints.remove.initiate({id:talk.id, slug:talk.slug, type:"Talk"}))
            navigate("/home",{replace:true})
        }}/>
}