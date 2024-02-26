import React from "react"
import {View, Text} from "react-native"
import Video from "./ted-talk"
const l10n=globalThis.l10n


export default class YouTubeVideo extends Video{
    static defaultProps={
        slug:"youtube",
        id:"youtube",
    }

    static mediaProps({autoplay, talk, dispatch, policyName, id=talk.id}){
        const Video=this.Video
        const media=(()=>{
            if(!talk.localVideo){
                return  (
                    <View style={{flex:1}}>
                        <View style={{flex:1, alignItems:"center", justifyContent:"center"}}>
                            <Text>{l10n['Downloading...']}</Text>
                        </View>
                    </View>
                )
            }
            return <Video
                posterSource={{ uri: talk.thumb }}
                source={{ uri: talk.localVideo }}
                shouldPlay={autoplay}
                style={{ flex: 1 }} />

        })();
        
        return {
            media,
            transcript: talk.transcript,
        }
    }

    static async onFavorite({id, talk, state, dispatch}){
    }
}