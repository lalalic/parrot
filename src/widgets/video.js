import React from "react"
import { Audio , Video as ExpoVideo} from "expo-av"
import { View, Text, ScrollView } from "react-native";
import * as Print from "expo-print";
import * as FileSystem from 'expo-file-system';
import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';

import { PressableIcon, PolicyChoice, html, FlyMessage } from '../components';
import { Subtitles } from "../components/player"

export default class extends React.Component{
    static Actions({talk, policyName, toggleTalk, dispatch, navigate, slug=talk.slug, favorited=talk.favorited, hasHistory=talk.hasHistory}){
        const hasTranscript = !!talk.languages?.mine?.transcript;
        const margins = { right: 100, left: 20, top: 20, bottom: 20 };
        return (
            <PolicyChoice label={true} labelFade={true} value={policyName}
                onValueChange={policy => navigate(`/talk/${slug}/${policy}`, { replace: true })}>

                {hasTranscript && <PressableIcon name="print"
                    onLongPress={async()=>await Print.printAsync({ html: html(talk, 130, margins, true), margins })}
                    onPress={async (e) =>await Print.printAsync({ html: html(talk, 130, margins, false), margins })} 
                />}

                {hasHistory && <PressableIcon name="clear" 
                    onLongPress={e => dispatch({ type: "talk/clear", id: talk.id })}
                    onPress={e => dispatch({ type: "talk/clear/history", id: talk.id })} 
                />}

                <PressableIcon name={favorited ? "favorite" : "favorite-outline"}
                    onPress={async (e) => {
                        try {
                            const folder=`${FileSystem.documentDirectory}${talk.id}`
                            const localUri = `${folder}/video.mp3`
                            
                            if (favorited) {
                                await FileSystem.deleteAsync(localUri, { idempotent: true })
                                toggleTalk("favorited")
                            } else {
                                const info = await FileSystem.getInfoAsync(folder)
                                if (!info.exists) {
                                    await FileSystem.makeDirectoryAsync(localUri, { intermediates: true })
                                }

                                const session=await FFmpegKit.execute(`-i "${talk.video}" -vn "${localUri}"`)
                                const returnCode = await session.getReturnCode();
                                if (ReturnCode.isSuccess(returnCode)) {
                                    toggleTalk("favorited", localUri);
                                }else{
                                    const logs = await session.getLogs();
                                    logs.forEach(log=>console.debug(log))
                                    FlyMessage.error(`can't download audio`)
                                }
                            }
                        } catch (e) {
                            FlyMessage.error(`can't download audio: ${e.message}`)
                        }
                    }}/>
            </PolicyChoice>
        )
    }

    static Info({talk, policyName, toggleTalk, dispatch, navigate, style}){
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
                const root=`${FileSystem.documentDirectory}${talk.id}`
                const localUri=`${root}/${chunk.time}.mp3`
                const session=await FFmpegKit.execute(`-ss ${chunk.time/1000} -i "${talk.favorited||talk.video}" -t ${(chunk.end-chunk.time)/1000} -vn -c:a copy "${localUri}"`)
                const returnCode = await session.getReturnCode();
                if (ReturnCode.isSuccess(returnCode)) {
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
                }else{
                    FlyMessage.error(`Can't crop, leave it as it is.`)
                }
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