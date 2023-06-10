import React from "react"
import { Audio , Video as ExpoVideo} from "expo-av"
import { Text, ScrollView } from "react-native";
import * as Print from "expo-print";
import * as FileSystem from 'expo-file-system';

import { PressableIcon, PolicyChoice, html } from '../components';
import { Subtitles } from "../components/player"
import mpeg from "../experiment/mpeg";

export default class extends React.Component{
    static Actions({talk, policyName, dispatch, navigate, slug=talk.slug, favorited=talk.favorited, hasHistory=talk.hasHistory}){
        const hasTranscript = !!talk.languages?.mine?.transcript;
        const margins = { right: 100, left: 20, top: 20, bottom: 20 };
        return (
            <PolicyChoice label={true} labelFade={true} value={policyName}
                excludes={!hasTranscript ? ["shadowing","dictating","retelling"] : []}
                onValueChange={policy => navigate(`/talk/${slug}/${policy}`, { replace: true })}>

                {hasTranscript && <PressableIcon name="print"
                    onLongPress={async()=>await Print.printAsync({ html: html(talk, 130, margins, true), margins })}
                    onPress={async (e) =>await Print.printAsync({ html: html(talk, 130, margins, false), margins })} 
                />}

                {hasHistory && <PressableIcon name="delete-sweep" 
                    onLongPress={e => dispatch({ type: "talk/clear", id: talk.id })}
                    onPress={e => dispatch({ type: "talk/clear/history", id: talk.id })} 
                />}

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
            onLongtermChallenge: async chunk => {
                const localUri=`${FileSystem.documentDirectory}${talk.id}/${chunk.time}.mp4`

                await mpeg.sliceAudio({
                    source:talk.video,
                    target: localUri,
                    start:chunk.time/1000, duration:(chunk.end-chunk.time)/1000
                })

                dispatch({ type: "talk/challenge/remove", talk, policy: policyName, chunk });
                dispatch({
                    type: "talk/challenge", policy: policyName,
                    chunk: { ...chunk, audio: localUri, time:undefined, end:undefined },
                    talk: {
                        slug: "long_term_challenge",
                        title: "challenges from talks",
                        thumb: require("../../assets/challenge-book.jpeg"),
                        id: "challenge",
                        favorited: true,
                    }
                })
            }
        }
    }

    static Video=React.forwardRef((props,ref)=>{
        return <ExpoVideo 
            shouldCorrectPitch={true}
            pitchCorrectionQuality={Audio.PitchCorrectionQuality.High}
            progressUpdateIntervalMillis={100}
            {...props} 
            ref={ref}/>
    })
}