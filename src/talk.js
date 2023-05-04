import React from 'react';
import { useParams, useNavigate } from 'react-router-native'
import Player from "./components/player"
import {useSelector, useDispatch, } from 'react-redux';
import * as FileSystem from 'expo-file-system';
import Video from './widgets/video';

import { Ted, selectPolicy} from "./store"

export default function Talk({autoplay}){
    const navigate= useNavigate()
    const dispatch=useDispatch()
    const {slug,policy: policyName="general", id}=useParams()
    const {data:talk={}}=Ted.useTalkQuery({slug, id})
    const Media=globalThis.Widgets[slug]||Video

    const policy=useSelector(state=>selectPolicy(state,policyName,talk.id))

    const challenging=useSelector(state=>!!state.talks[talk.id]?.[policyName]?.challenging)
    
    const toggleTalk=React.useCallback((key,value)=>dispatch({type:"talk/toggle", key,value, talk, policy:policyName}),[policyName,talk])

    const style=policy.visible ? {flex:1}: {height:150}

    const [info, actions]=React.useMemo(()=>([
        Media.Info({talk, policyName, toggleTalk, dispatch,navigate, style:{flex: 1, padding: 5, flexGrow: 1 }}),
        Media.Actions({talk, policyName, toggleTalk, dispatch,navigate,})
    ]),[talk, policyName, toggleTalk, dispatch,navigate])

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
            {...{id:talk.id, challenging, key:`${policyName}-${talk.id}`, policyName, policy, 
                style,
                title:talk.title,
                ...Media.mediaProps({autoplay, talk, dispatch, policyName})
            }}
            >
            {info}
            {actions}
        </Player>
    )
}