import React from 'react';
import {View} from "react-native"
import { useParams,  } from 'react-router-native'
import Player, {NavBar, Subtitles} from "./player"
import {useSelector, useDispatch} from 'react-redux';
import {Ted} from "./store"

export default function ShadowTalk({autoplay}){
    const Policy=useSelector(state=>state.policy)
    
    const {slug, policy="general"} = useParams();
    const {data:talk={}}=Ted.useTalkQuery(slug)
    const talkSetting=useSelector(state=>state.talks[talk.id])
    const talkPolicySetting=talkSetting?.[policy]
    
    const dispatch=useDispatch()
    const toggleTalk=(key,value)=>dispatch({type:"talk/toggle",id:talk.id, key,value, talk})
    
    return (
        <Player talk={talk} 
            style={{height:100}}
            autoplay={true} 
            challenges={talkPolicySetting?.challenges} 
            record={talkPolicySetting?.record}
            policy={{...Policy.general,...Policy[policy],...talkSetting?.[policy]}}
            onPolicyChange={changed=>talkSetting && toggleTalk(policy,changed)}
            onRecordDone={record=>dispatch({type:"talk/recording",talk,id:talk.id, policy, record})}
            onCheckChunk={chunk=>dispatch({type:"talk/challenge",talk,id:talk.id, policy, chunk})}
            controls={{nav:false, subtitle:false, progress:false}}
            />
    )
}