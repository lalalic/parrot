import React from 'react';
import { useParams, useNavigate } from 'react-router-native'
import Player from "./components/player"
import {useSelector, useDispatch, } from 'react-redux';
import * as FileSystem from 'expo-file-system';
import Video from './widgets/video';

import { Ted, selectPolicy, Youtube} from "./store"

export default function Talk({autoplay}){
    const navigate= useNavigate()
    const dispatch=useDispatch()
    const {slug,policy: policyName="general", id}=useParams()
    
    const Media=globalThis.Widgets[slug]||Video

    const {data:talk={}}=useTalkQuery({slug, id})
    
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
            onFixChunk={time=>dispatch({type:"talk/fix/chunk",talk, time})}
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

function useTalkQuery({slug, id=slug}){
    let talk
    if(!!globalThis.Widgets[slug]){
        talk=useSelector(state=>state.talks[id])
        if(!talk){
            talk=globalThis.Widgets[slug].defaultProps
        }else{
            talk.hasHistory=true
        }
    }else{
        const {data={}}=(()=>{
            if(slug=="youtubepotential"){
                return Youtube.useTalkQuery({id})
            }else{
                return Ted.useTalkQuery({slug})
            }
        })();
        const talkLocal=useSelector(state=>state.talks[data.id])
        talk=React.useMemo(()=>{
            const talk={...talkLocal, ...data, hasHistory:!!talkLocal}
            /*
            if(talkLocal?.fixes && data.languages?.mine?.transcript){
                const fixes=[...talkLocal.fixes]
                const transcript=[...data.languages.mine.transcript]
                fixes.sort((a,b)=>b-a).forEach(removing=>{
                    const iP=transcript.findIndex(({cues})=>cues[cues.length-1].end>removing)
                    if(iP!=-1){
                        const i=transcript[iP].cues.findIndex(a=>a.time==removing)
                        if(i>0){
                            const p=transcript[iP]={...transcript[iP]}
                            p.cues=[...p.cues]
                            const [merged]=p.cues.splice(i,1)
                            const merging=p.cues[i-1]={...p.cues[i-1]}
                            merging.text+=" "+merged.text
                            merging.my+=" "+merged.my
                            merging.end=merged.end
                        }
                    }
                })
                delete talk.fixes
                talk.languages={mine:{transcript}}
            }
            */
            return talk
        },[data, talkLocal])
    }
    const {general, shadowing, dictating, retelling, tags, ...data}=talk
    return {data}
}