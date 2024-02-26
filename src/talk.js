import React from 'react';
import { useParams, useNavigate, } from 'react-router-native'
import Player from "./components/player"
import {useDispatch, } from 'react-redux';
import * as FileSystem from 'expo-file-system';
import Video from './widgets/ted-talk';

import { useTalkQuery } from './components';
import Loading from "react-native-use-qili/components/Loading";

export default function Talk({autoplay}){
    const navigate= useNavigate()
    const dispatch=useDispatch()
    const {slug,policy: policyName="general", id}=useParams()
    
    const Media=globalThis.Widgets[slug]||Video

    const {data:talk={}, policy={}, challenging, parentControled, isLoading}=useTalkQuery({slug, id, policyName})
    
    const style=policy.fullscreen || (policy.visible&&!talk.miniPlayer) ? {flex:1}: {height:200}

    const [info, actions]=React.useMemo(()=>([
        Media.Info({talk, policyName, dispatch,navigate, style:{flex: 1, padding: 5, flexGrow: 1 }}),
        Media.Actions({talk, policyName, dispatch,navigate,parentControled})
    ]),[talk, policyName, dispatch,navigate])

    if(isLoading){
        return <Loading/>
    }

    return (
        <Player
            onPolicyChange={changed=>dispatch({type:"talk/policy",talk, target:policyName,payload:changed})}
            onQuit={({time})=>dispatch({type:"talk/policy/history",talk, target:policyName,payload:{history:time}})}
            onRecordChunk={props=>dispatch({type:"talk/recording",talk, policy, policyName, ...props})}
            toggleChallengeChunk={chunk=>dispatch({type:"talk/challenge/toggle",talk, policy:policyName, chunk})}
        
            getRecordChunkUri={({time,end})=>`${FileSystem.documentDirectory}${talk.id}/${policyName}/audios/${time}-${end}.wav`}
            {...{id:talk.id, challenging, key:`${policyName}-${talk.id}`, policyName, policy, 
                style,
                title:talk.title,
                ...Media.mediaProps({autoplay, talk, dispatch, policyName, parentControled})
            }}
            >
            {info}
            {actions}
        </Player>
    )
}

