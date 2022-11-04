import React from 'react';
import {View, Text, StyleSheet, Pressable} from "react-native"
import { useParams, useNavigate } from 'react-router-native'
import Player, {NavBar, Subtitles, Challenges} from "./player"
import { PressableIcon, PolicyIcons, PlayButton } from './components';
import * as Print from "expo-print"
import {useSelector, useDispatch, } from 'react-redux';
import * as FileSystem from 'expo-file-system';

import {Ted} from "./store"

const extract=(o,proto)=>!o ? o: Object.keys(o).reduce((a,k)=>(k in proto && (a[k]=o[k]), a),{})
export default function Talk({autoplay, slug, policy: policyName="general"}){
    const navigate= useNavigate()
    const dispatch=useDispatch()
    const Policy=useSelector(state=>state.policy)
    const {data:talk={}}=Ted.useTalkQuery(slug)

    const {policy, challenging}=useSelector(state=>{
        const {desc,...policy}={
            ...Policy.general,
            ...Policy[policyName],
            ...extract(state.talks[talk.id]?.[policyName],Policy.general)}
        return {policy, challenging:!!state.talks[talk.id]?.[policyName]?.challenging}
    })

    
    const toggleTalk=(key,value)=>dispatch({type:"talk/toggle",id:talk.id, key,value, talk})
    
    switch(policyName){
        case "general":
            children=<TalkInfo {...{style:{ flex: 1, padding: 5, }, talk, policy:policyName, toggleTalk,dispatch}}/>
            break
        default:
            children=<Challenges {...{style:{flex:1, padding:5}}}/>
            break
    }

    return (
        <View style={{flex:1}}>
            <View style={{flex:1, flexGrow:1}}>
                <Player {...{autoplay, policy, challenging, talk, style:{flex:1},}}
                    onPolicyChange={changed=>toggleTalk(policyName,changed)}
                    onFinish={e=>!challenging && toggleTalk("challenging",true)}
                    onCheckChunk={chunk=>dispatch({type:"talk/challenge",talk,id:talk.id, policy: policyName, chunk})}
                    onRecordChunkUri={({time,end})=>`${FileSystem.documentDirectory}${talk.id}/${policyName}/audios/${time}-${end}`}
                    onRecordChunk={({chunk:{time,end},recognized})=>dispatch({type:"talk/recording",talk,id:talk.id, policy: policyName, record:{[`${time}-${end}`]:recognized}})}
                    >
                    {children}
                </Player>
            </View>
            <View style={styles.nav}>
                {"shadowing,dictating,retelling".split(",").map(k=>(
                    <PressableIcon key={k} name={PolicyIcons[k]} 
                        color={policyName==k ? "red" : undefined}
                        onPress={e=>navigate(policyName==k ? `/talk/${slug}` : `/talk/${slug}/${k}`,{replace:true})}
                        />
                ))}
                <DeleteButton {...{dispatch,talk,policy:policyName}}/>
            </View>
        </View>
    )
}
function DeleteButton({talk, policy, dispatch}){
    const hasPolicyHistory=useSelector(state=>{
        if(!!state.talks[talk.id]?.[policy]){
            return {hasRecords:!!state.talks[talk.id][policy].records}
        }
    })
    return (
        <PressableIcon
            name={hasPolicyHistory ? (hasPolicyHistory.hasRecords ? "delete" : "delete-forever") : "delete-outline"}
            onPress={e=>dispatch({type:"talk/clear/policy/record",id:talk.id, talk, policy})}
            onLongPress={e=>dispatch({type:"talk/clear/policy",id:talk.id, talk, policy})}
            />
    )
}
const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    content: {
        flexGrow: 1,
        flex:1
    },
    header: {
      fontSize: 20
    },
    nav: {
        flexDirection: "row",
        justifyContent: "space-around",
    },
    navItem: {
      flex: 1,
      alignItems: "center",
      padding: 10
    },
    subNavItem: {
      padding: 5
    },
    topic: {
      textAlign: "center",
      fontSize: 15
    }
  });

const html=(transcript)=>`
    <html>
        <body>
            ${transcript}
        </body>
    </html>

`
function TalkInfo({talk, policy, dispatch, toggleTalk, style}) {
    const {favorited,hasHistory}=useSelector(state=>({
            favorited:state.talks[talk.id]?.favorited ,
            hasHistory:!!state.talks[talk.id]
        }
    ))
    return (
        <View style={style}>
            <Text style={{ fontSize: 20, }}>{talk.title}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-evenly", paddingTop: 20, paddingBottom: 20 }}>
                <PressableIcon name={favorited ? "favorite" : "favorite-outline"}
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
                                    await FileSystem.downloadAsync(talk.nativeDownloads.medium, localUri);
                                    toggleTalk("favorited",localUri)
                                }
                            }
                        }catch(e){
                            console.error(e)
                        }
                    }} />
                <PressableIcon name="print" onPress={async (e) => {
                    await Print.printAsync({
                        html: html(talk.paragraphs.map(a => a.cues.map(b => b.text).join("")).join("\n"))
                    });
                } } />

                {hasHistory && <PressableIcon name="delete" onPress={e=>dispatch({type:"talk/clear",id:talk.id, talk, policy})}/>}
            </View>
            <View>
                <Text>{talk.description}</Text>
            </View>
        </View>
    )
}

