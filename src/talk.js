import React from 'react';
import {View, Text, ScrollView,} from "react-native"
import { useParams, useNavigate } from 'react-router-native'
import Player, {Subtitles} from "./components/player"
import { PressableIcon, PolicyChoice, Video } from './components';
import * as Print from "expo-print"
import {useSelector, useDispatch, } from 'react-redux';
import * as FileSystem from 'expo-file-system';

import { Ted, selectPolicy} from "./store"
import { Audio } from 'expo-av';

export default function Talk({autoplay}){
    const navigate= useNavigate()
    const dispatch=useDispatch()
    const {slug,policy: policyName="general", id}=useParams()
    const {data:talk={}}=Ted.useTalkQuery({slug, id})
    const Widget=globalThis.Widgets[slug]

    const policy=useSelector(state=>selectPolicy(state,policyName,talk.id))

    const localUri = useSelector(state=>state.talks[talk.id]?.favorited?.trim?.())

    const challenging=useSelector(state=>!!state.talks[talk.id]?.[policyName]?.challenging)
    
    const toggleTalk=React.useCallback((key,value)=>dispatch({type:"talk/toggle", key,value, talk, policy:policyName}),[policyName,talk])
    
    const info=React.useMemo(()=>{
        const style={ flex: 1, padding: 5, flexGrow:1 }
        switch(policyName){
            case "general":
                return (
                    <Info {...{style, talk, toggleTalk,dispatch, favoritable:!Widget}}>
                        {!!Widget?.Tags && <Widget.Tags/>}
                    </Info>
                )
            default:{
                return <Subtitles {...{ policy:policyName, style}}/>
            }
        }
    },[talk, policyName])

    const props=React.useMemo(()=>{
        if(Widget){
            const media=<Widget shouldPlay={autoplay} id={id}/>
            const {controls}=media.props
            return {media,  controls}
        }else{
            return {
                media:<Video 
                    posterSource={{uri:talk.thumb}} 
                    source={{uri:/*localUri || */talk.resources?.hls.stream}} 
                    shouldPlay={autoplay}
                    useNativeControls={false}
                    style={{flex:1}}
                    />,
                transcript:talk.languages?.mine?.transcript
            }
        }
    },[talk,autoplay])

    const actions=React.useMemo(()=>{
        if(Widget && Widget.Actions){
            return <Widget.Actions talk={talk}/>
        }else{
            return <PolicyChoice label={true} labelFade={true} value={policyName}
                onValueChange={policy=>navigate(`/talk/${slug}/${policy}`, {replace:true})}/>
        }
    },[talk,policyName])

    const style=React.useMemo(()=>policy.visible ? {flex:1}: {height:150} ,[policy.visible])
    return (
        <Player 
            onPolicyChange={changed=>dispatch({type:"talk/policy",talk, target:policyName,payload:changed})}
            onFinish={e=>toggleTalk("challenging",!challenging ? true : undefined)}
            onQuit={({time})=>dispatch({type:"talk/policy",talk, target:policyName,payload:{history:time}})}
            onCheckChunk={chunk=>dispatch({type:"talk/challenge",talk, policy: policyName, chunk})}
            onChallengePass={chunk=>dispatch({type:"talk/challenge/remove",talk, policy: policyName, chunk})}
            onRecordChunkUri={({time,end})=>`${FileSystem.documentDirectory}${talk.id}/${policyName}/audios/${time}-${end}.wav`}
            onRecordChunk={({chunk:{time,end},recognized, score})=>dispatch({type:"talk/recording",talk, policy: policyName,score, record:{[`${time}-${end}`]:recognized}})}
            onRecordAudioMiss={({record:{time,end}})=>dispatch({type:"talk/recording/miss", talk, policy: policyName, record:`${time}-${end}` })}
            {...{id:talk.id, challenging, key:policyName, policyName, policy, 
                style,
                ...props
            }}
            >
            {info}
            {actions}
        </Player>
    )
}

function Info({talk, dispatch, toggleTalk, style, favoritable, children}) {
    const {favorited,hasHistory}=useSelector(state=>({
            favorited:state.talks[talk.id]?.favorited ,
            hasHistory:!!state.talks[talk.id]
        }
    ))
    const hasTranscript=!!talk.languages?.mine?.transcript
    return (
        <ScrollView style={style}>
            <Text style={{ fontSize: 20, }}>{talk.title}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-evenly", paddingTop: 20, paddingBottom: 20 }}>
                {favoritable && <PressableIcon name={favorited ? "favorite" : "favorite-outline"}
                    onPress={async(e)=>{
                        try{
                            const localUri = `${FileSystem.documentDirectory}${talk.id}/video.mp4`
                            toggleTalk("favorited")
                            if(favorited){
                                await FileSystem.deleteAsync(localUri, { idempotent: true });
                                return;
                            }else{
                                const info = await FileSystem.getInfoAsync(localUri);
                                if (!info.exists) {
                                    await FileSystem.makeDirectoryAsync(localUri, {intermediates:true})
                                    await FileSystem.downloadAsync(talk.nativeDownloads.medium, localUri);
                                    toggleTalk("favorited",localUri)
                                }
                            }
                        }catch(e){
                            
                        }
                    }} />}

                <PressableIcon name={hasTranscript ? "print" :""}
                    disabled={!hasTranscript}
                    onLongPress={async e=>{
                        try{
                            await Print.printAsync({html: html(talk, 200)})
                        }catch(e){

                        }
                    }}
                    onPress={async e=>{
                        try{
                            await Print.printAsync({html: html(talk, 120)})
                        }catch(e){

                        }
                    }}/>

                <PressableIcon name={hasHistory ? "delete" : ""} 
                    disabled={!hasHistory}
                    onLongPress={e=>dispatch({type:"talk/clear",id:talk.id})}
                    onPress={e=>dispatch({type:"talk/clear/history",id:talk.id})}
                    />
            </View>
            <View>
                <Text>{talk.description}</Text>
            </View>
            {children}
        </ScrollView>
    )
}

const html=(talk, lineHeight=120)=>`
    <html>
        <style>
            p{line-height:${lineHeight}%;margin:0;}
            body{padding:5mm}
            @page{
                margin-top:2cm;
                margin-bottom:1cm;
            }
        </style>
        <body>
            <h2>
                <span>${talk.title}</span>
                <span style="font-size:12pt;float:right;padding-right:10mm">${new Date().asDateString()}</span>
            </h2>
            ${talk.languages?.en?.transcript?.map(a => a.cues.map(b => b.text).join("")).map(a=>`<p>${a}</p>`).join("\n")}
        </body>
    </html>

`

