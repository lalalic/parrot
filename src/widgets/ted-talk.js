import React from "react"
import { Audio , Video as ExpoVideo} from "expo-av"
import { Text, ScrollView } from "react-native";
import * as Print from "expo-print";
import * as FileSystem from 'expo-file-system';

import { PolicyChoice, html } from '../components';
import ClearAction from '../components/ClearAction';

import PressableIcon from "react-native-use-qili/components/PressableIcon";
import { Subtitles } from "../components/player"
import mpegKit from "../experiment/mpeg"
import prepareFolder from "react-native-use-qili/components/prepareFolder";
import FlyMessage from "react-native-use-qili/components/FlyMessage";
import { Qili, Ted } from "../store";
const l10n=globalThis.l10n


export default class TedTalk extends React.Component{
    static Actions({talk, policyName, dispatch, navigate, slug=talk.slug, favorited=talk.favorited}){
        const hasTranscript = !!talk.languages?.mine?.transcript;
        const margins = { right: 100, left: 20, top: 20, bottom: 20 };
        return (
            <PolicyChoice label={true} labelFade={true} value={policyName}
                excludes={!hasTranscript ? ["shadowing","dictating","retelling"] : []}
                onValueChange={policyName => navigate(`/talk/${slug}/${policyName}/${talk.id}`, { replace: true })}>

                {hasTranscript && <PressableIcon name="print"
                    onLongPress={async()=>await Print.printAsync({ html: html(talk, 130, margins, true), margins })}
                    onPress={async (e) =>await Print.printAsync({ html: html(talk, 130, margins, false), margins })} 
                />}

                {talk.hasLocal && <ClearAction {...{talk, policyName}}/>}

                {hasTranscript&&<PressableIcon name={favorited ? "favorite" : "favorite-outline"}
                    onPress={async (e) =>dispatch({type:"talk/toggle/favorited", talk})}/>}
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
            transcript: talk.languages?.mine?.transcript,
        }
    }

    static Video=React.forwardRef(({policy, whitespacing, ...props},ref)=>{
        return <ExpoVideo 
            shouldCorrectPitch={true}
            pitchCorrectionQuality={Audio.PitchCorrectionQuality.High}
            progressUpdateIntervalMillis={100}
            {...props} 
            ref={ref}/>
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
}