import React from "react"
import { View } from "react-native"
import YoutubePlayer from "react-native-youtube-iframe"
import {useStateAndLatest } from "../components"

import Video from "./video"


export default class YouTubeVideo extends Video{
    
    static defaultProps={
        slug:"youtube",
        id:"youtube",
        progressUpdateIntervalMillis:100,
    }

    static Video=React.forwardRef(({onPlaybackStatusUpdate,progressUpdateIntervalMillis=100,shouldPlay, source, ...props},ref)=>{
        const [playing, setPlaying, $playing]=useStateAndLatest(shouldPlay)
        
        React.useEffect(async ()=>{
            if(ref.current){
                const durationMillis=parseInt(1000 * await ref.current.getDuration())
                onPlaybackStatusUpdate?.({
                    positionMillis: 0,  
                    durationMillis, 
                    isLoaded:false, 
                    isLoading:true, 
                    didJustFinish:false,
                    isPlaying: false
                })

                ref.current.setStatusAsync=({positionMillis, shouldPlay})=>{
                    if(shouldPlay!=undefined){
                        setPlaying(shouldPlay)
                    }
                    if(positionMillis!=undefined){
                        ref.current.seekTo(positionMillis/1000,false)
                    }
                }

                setInterval(async ()=>{
                    const positionSeconds=await ref.current.getCurrentTime()
                    onPlaybackStatusUpdate?.({
                        positionMillis: parseInt(positionSeconds*1000),  
                        durationMillis, 
                        isLoaded:true, 
                        isLoading:false, 
                        didJustFinish:false,
                        isPlaying:$playing.current
                    })
                },progressUpdateIntervalMillis)
            }
        },[ref.current])
        return (
            <View style={style}>
                <YoutubePlayer ref={ref} videoId={source.uri} play={playing}/>
            </View>
        )
    })
}