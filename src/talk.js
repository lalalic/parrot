import React from 'react';
import { useParams, useNavigate } from 'react-router-native'
import Player from "./components/player"
import {useSelector, useDispatch, } from 'react-redux';
import * as FileSystem from 'expo-file-system';
import Video from './widgets/video';

import { TalkApi, selectPolicy, isAdmin} from "./store"
import { Loading } from './components';

export default function Talk({autoplay}){
    const navigate= useNavigate()
    const dispatch=useDispatch()
    const {slug,policy: policyName="general", id}=useParams()
    
    const Media=globalThis.Widgets[slug]||Video

    const {data:talk={}, policy={}, isLoading}=useTalkQuery({slug, id, policyName})
    const {challenging}=policy
    
    const style=policy.visible ? {flex:1}: {height:150}

    const [info, actions]=React.useMemo(()=>([
        Media.Info({talk, policyName, dispatch,navigate, style:{flex: 1, padding: 5, flexGrow: 1 }}),
        Media.Actions({talk, policyName, dispatch,navigate,})
    ]),[talk, policyName, dispatch,navigate])

    if(isLoading){
        return <Loading/>
    }

    return (
        <Player
            onPolicyChange={changed=>dispatch({type:"talk/policy",talk, target:policyName,payload:changed})}
            onFinish={e=>dispatch({type:"talk/toggle/challenging",talk, policy: policyName, value: !challenging ? true : undefined})}
            onQuit={({time})=>dispatch({type:"talk/policy",talk, target:policyName,payload:{history:time}})}
            onCheckChunk={chunk=>dispatch({type:"talk/challenge",talk, policy: policyName, chunk})}
            onChallengePass={chunk=>dispatch({type:"talk/challenge/remove",talk, policy: policyName, chunk})}
            onRecordChunk={({chunk:{time,end},recognized, score})=>dispatch({type:"talk/recording",talk, policy: policyName,score, record:{[`${time}-${end}`]:recognized}})}
            onRecordChunkUri={({time,end})=>`${FileSystem.documentDirectory}${talk.id}/${policyName}/audios/${time}-${end}.wav`}
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

function useTalkQuery({slug, id, policyName}){
    const {data:remote={}, ...status}=TalkApi.useTalkQuery({slug,id})
    const [local,bAdmin ]=useSelector(state=>[state.talks[remote?.id],isAdmin(state)])
    const policy=useSelector(state=>selectPolicy(state,policyName,remote?.id))

    const talk=React.useMemo(()=>{
        const Widget=globalThis.Widgets[slug]
        return {
            ...remote, 
            ...Widget?.defaultProps, 
            ...local, 
            hasHistory:!!local, 
            video:bAdmin ? remote?.video : local?.localVideo||remote?.video
        }
    },[remote, local])
    
    const {general, shadowing, dictating, retelling, ...data}=talk
    
    return {data, policy, ...status}
}