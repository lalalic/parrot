import React from "react"
import { Audio , Video as ExpoVideo} from "expo-av"
import { View, Text, ScrollView } from "react-native";
import * as Print from "expo-print";
import { useSelector } from 'react-redux';
import * as FileSystem from 'expo-file-system';

import { PressableIcon, PolicyChoice, html } from '../components';
import { Subtitles } from "../components/player"

export default class extends React.Component{
    static Actions({talk, policyName, toggleTalk, dispatch, navigate, slug=talk.slug}){
        const { favorited, hasHistory } = useSelector(state => ({
            favorited: state.talks[talk.id]?.favorited,
            hasHistory: !!state.talks[talk.id]
        }));
        const hasTranscript = !!talk.languages?.mine?.transcript;
        const margins = { right: 100, left: 20, top: 20, bottom: 20 };
        return (
            <PolicyChoice label={true} labelFade={true} value={policyName}
                onValueChange={policy => navigate(`/talk/${slug}/${policy}`, { replace: true })}>

                {hasTranscript && <PressableIcon name={hasTranscript ? "print" : ""}
                    disabled={!hasTranscript}
                    onLongPress={async()=>await Print.printAsync({ html: html(talk, 130, margins, true), margins })}
                    onPress={async (e) =>await Print.printAsync({ html: html(talk, 130, margins, false), margins })} 
                />}

                {hasHistory && <PressableIcon name={hasHistory ? "delete" : ""}
                    onLongPress={e => dispatch({ type: "talk/clear", id: talk.id })}
                    onPress={e => dispatch({ type: "talk/clear/history", id: talk.id })} 
                />}

                <PressableIcon name={favorited ? "favorite" : "favorite-outline"}
                    onPress={async (e) => {
                        try {
                            const localUri = `${FileSystem.documentDirectory}${talk.id}/video.mp4`;
                            toggleTalk("favorited");
                            if (favorited) {
                                await FileSystem.deleteAsync(localUri, { idempotent: true });
                                return;
                            } else {
                                const info = await FileSystem.getInfoAsync(localUri);
                                if (!info.exists) {
                                    await FileSystem.makeDirectoryAsync(localUri, { intermediates: true });
                                    await FileSystem.downloadAsync(talk.nativeDownloads.medium, localUri);
                                    toggleTalk("favorited", localUri);
                                }
                            }
                        } catch (e) {
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
                        <Text style={{ fontSize: 20}}>{talk.title}</Text>
                        <Text>{talk.description}</Text>
                    </ScrollView>
                )
            default: 
                return <Subtitles {...{ policy: policyName, style }} />;
        }
    }

    static mediaProps({autoplay, talk, dispatch, policyName, id=talk.id}){
        return {
            media: <Video
                posterSource={{ uri: talk.thumb }}
                source={{ uri: talk.resources?.hls.stream }}
                shouldPlay={autoplay}
                useNativeControls={false}
                style={{ flex: 1 }} />,
            transcript: talk.languages?.mine?.transcript,
            onLongtermChallenge: chunk => {
                dispatch({ type: "talk/challenge/remove", talk, policy: policyName, chunk });
                dispatch({
                    type: "talk/challenge", policy: policyName,
                    chunk: { ...chunk, uri: talk.resources?.hls.stream },
                    talk: {
                        slug: "long_term_challenge",
                        title: "challenges from talks",
                        thumb: require("../../assets/challenge-book.jpeg"),
                        id: "challenge",
                        favorited: true,
                    }
                });
            }
        }
    }
}


const Video=(()=>{
    return React.forwardRef(({onPlaybackStatusUpdate,...props},ref)=>{
        return <ExpoVideo 
            shouldCorrectPitch={true}
            pitchCorrectionQuality={Audio.PitchCorrectionQuality.High}
            progressUpdateIntervalMillis={100}
            onPlaybackStatusUpdate={status=>{
                onPlaybackStatusUpdate?.(status)
            }}
            {...props} 
            ref={ref}/>
    })
})();
