import React from "react"
import Video from "./ted-talk"


export default class YouTubeVideo extends Video{
    static defaultProps={
        slug:"youtube",
        id:"youtube",
    }

    static mediaProps({autoplay, talk, dispatch, policyName, id=talk.id}){
        const Video=this.Video
        return {
            media: <Video
                posterSource={{ uri: talk.thumb }}
                source={{ uri: talk.video }}
                shouldPlay={autoplay}
                style={{ flex: 1 }} />,
            transcript: talk.languages?.mine?.transcript,
        }
    }

    static async onFavorite({id, talk, state, dispatch}){
    }
}