import React from "react"
import { View } from "react-native"
import YoutubePlayer from "react-native-youtube-iframe"
import {useStateAndLatest } from "../components"

import Video from "./video"


export default class YouTubeVideo extends Video{
    static defaultProps={
        slug:"youtube",
        id:"youtube",
        progressUpdateIntervalMillis:500,
    }

    static Video=React.forwardRef(({onPlaybackStatusUpdate,progressUpdateIntervalMillis=100,shouldPlay, source, ...props},ref)=>{
        const [playing, setPlaying, $playing]=useStateAndLatest(shouldPlay)
        const [ready, setReady]=React.useState(false)
        const videoRef=React.useRef(null)
        
        React.useImperativeHandle(ref, ()=>{
            return {
                setStatusAsync:({positionMillis, shouldPlay})=>{
                    if(shouldPlay!=undefined){
                        setPlaying(shouldPlay)
                    }
                    if(positionMillis!=undefined){
                        videoRef.current.seekTo(positionMillis/1000,false)
                    }
                }
            }
        },[])

        const updateRef=React.useRef(onPlaybackStatusUpdate)
        updateRef.current=onPlaybackStatusUpdate
        React.useEffect(()=>{
            if(!ready)
                return 

            let timer;
            videoRef.current?.getDuration().then(second=>{
                let last={}
                const durationMillis=parseInt(1000 * second)
                updateRef.current?.(last={
                    positionMillis: 0,  
                    durationMillis, 
                    isLoaded:true, 
                    isLoading:false, 
                    didJustFinish:false,
                    isPlaying: $playing.current
                })
                
                timer=setInterval(()=>{
                    videoRef.current?.getCurrentTime().then(positionSeconds=>{
                        const current={
                            positionMillis: parseInt(positionSeconds*1000),  
                            durationMillis, 
                            isLoaded:true, 
                            isLoading:false, 
                            didJustFinish:false,
                            isPlaying:$playing.current
                        }
                        if(last.positionMillis==current.positionMillis && last.isPlaying==current.isPlaying){
                            return 
                        }
                        updateRef.current?.(current)
                        last=current
                    })
                },progressUpdateIntervalMillis)
            })

            return ()=>timer && clearInterval(timer)
            
        },[ready])
        
        return (
            <View {...props}>
                <YoutubePlayer {...{ref:videoRef, videoId:source.uri, play:playing, 
                    style:{flex:1}, height:300, initialPlayerParams:{controls:false,fs:0,preventFullScreen:true}}}
                    onReady={React.useCallback(e=>{
                        setReady(true)
                    },[])}
                />
            </View>
        )
    })
}