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
        const Video=this
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
                {...talk}
                posterSource={{ uri: talk.thumb }}
                source={{ uri: talk.localVideo }}
                shouldPlay={autoplay}
                style={{ flex: 1 }} />

        })();
        
        return {
            media,
        }
    }

    static async onFavorite({id, talk, state, dispatch}){
        if(Qili.isUploaded(talk.video))
            return 
        
        const {lang, mylang}=state.my
        
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

        dispatch({type:"talk/set", talk:{id, video:url}})

        FlyMessage.show(`Cloned to server`)
    }
}