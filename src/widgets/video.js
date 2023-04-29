import React from "react"
import { Audio , Video as ExpoVideo} from "expo-av"
import { View, Text, ScrollView } from "react-native";
import * as Print from "expo-print";
import { useSelector } from 'react-redux';
import * as FileSystem from 'expo-file-system';

import { PressableIcon, PolicyChoice } from '../components';
import { Subtitles } from "../components/player"

export default class extends React.Component{
    static Actions({talk, policyName, navigate, slug=talk.slug}){
        return <PolicyChoice 
            label={true} 
            labelFade={true} 
            value={policyName}
            onValueChange={policy => navigate(`/talk/${slug}/${policy}`, { replace: true })} />
    }

    static Info({talk, policyName, toggleTalk, dispatch, navigate}){
        const style = { flex: 1, padding: 5, flexGrow: 1 };
        switch (policyName) {
            case "general":
                return <Info {...{ style, talk, toggleTalk, dispatch, favoritable: true }}/>
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

function Info({ talk, dispatch, toggleTalk, style, favoritable, children }) {
    const { favorited, hasHistory } = useSelector(state => ({
        favorited: state.talks[talk.id]?.favorited,
        hasHistory: !!state.talks[talk.id]
    }
    ));
    const hasTranscript = !!talk.languages?.mine?.transcript;
    const margins = { right: 100, left: 20, top: 20, bottom: 20 };
    return (
        <ScrollView style={style}>
            <Text style={{ fontSize: 20, }}>{talk.title}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-evenly", paddingTop: 20, paddingBottom: 20 }}>
                {favoritable && <PressableIcon name={favorited ? "favorite" : "favorite-outline"}
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
                    }} />}

                <PressableIcon name={hasTranscript ? "print" : ""}
                    disabled={!hasTranscript}
                    onLongPress={async (e) => {
                        try {
                            await Print.printAsync({ html: html(talk, 130, margins, true), margins });
                        } catch (e) {
                        }
                    }}
                    onPress={async (e) => {
                        try {
                            await Print.printAsync({ html: html(talk, 130, margins, false), margins });
                        } catch (e) {
                        }
                    }} />

                <PressableIcon name={hasHistory ? "delete" : ""}
                    disabled={!hasHistory}
                    onLongPress={e => dispatch({ type: "talk/clear", id: talk.id })}
                    onPress={e => dispatch({ type: "talk/clear/history", id: talk.id })} />
            </View>
            <View>
                <Text>{talk.description}</Text>
            </View>
            {children}
        </ScrollView>
    );
}
const html = (talk, lineHeight, margins, needMy) => `
    <html>
        <style>
            p{line-height:${lineHeight}%;margin:0;text-align:justify}
            @page{
                ${Object.keys(margins).map(k => `margin-${k}:${margins[k]}`).join(";")}
            }
        </style>
        <body>
            <h2>
                <span>${talk.title}</span>
                <span style="font-size:12pt;float:right;padding-right:10mm">${talk.speaker} ${new Date().asDateString()}</span>
            </h2>
            ${talk.languages?.mine?.transcript?.map(a => {
    const content = a.cues.map(b => b.text).join("");
    const my = needMy && a.cues.map(b => b.my ?? "").join("");
    const time = ((m = 0, b = m / 1000, a = v => String(Math.floor(v)).padStart(2, '0')) => `${a(b / 60)}:${a(b % 60)}`)(a.cues[0].time);
    return `<p><i>${time}</i> ${content}</p>${my ? `<p>${my}</p>` : ""}`;
}).join("\n")}
        </body>
    </html>

`;
