import React from 'react';
import {View, Text, StyleSheet} from "react-native"
import { useParams, Link } from 'react-router-native'
import Player, {NavBar, Subtitles, Challenges} from "./player"
import { PressableIcon, PolicyIcons, PlayButton } from './components';
import * as Print from "expo-print"
import {useSelector, useDispatch} from 'react-redux';
import * as FileSystem from 'expo-file-system';

import {Ted} from "./store"

const extract=(o,proto)=>!o ? o: Object.keys(o).reduce((a,k)=>(k in proto && (a[k]=o[k]), a),{})
export default function Talk({autoplay, policy: policyName="general"}){
    const Policy=useSelector(state=>state.policy)
    
    const {slug} = useParams();
    const {data:talk={}}=Ted.useTalkQuery(slug)
    const {policy, challenging}=useSelector(state=>{
        const {desc,...policy}={
            ...Policy.general,
            ...Policy[policyName],
            ...extract(state.talks[talk.id]?.[policyName],Policy.general)}
        const {[policyName]:{challenging}={}}=!!state.talks[talk.id]||{}
        return {policy, challenging}
    })
    
    const dispatch=useDispatch()
    const toggleTalk=(key,value)=>dispatch({type:"talk/toggle",id:talk.id, key,value, talk})
    
    switch(policyName){
        case "general":
            children=<TalkInfo {...{style:{ flex: 1, padding: 5, }, talk, policy:policyName, toggleTalk}}/>
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
                <PlayButton name="arrow-drop-up" showPolicy={true}/>
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
function TalkInfo({talk, policy, toggleTalk, style}) {
    const [downloading, setDownloading]=React.useState(false)
    const {favorited,downloaded,hasHistory}=useSelector(state=>{
        const {[policy]:{favorited,downloaded}={}}=state[talk.id]||{}
        return {favorited,downloaded,hasHistory:!!state[talk.id]}
    })
    const dispatch=useDispatch()
    return (
        <View style={style}>
            <Text style={{ fontSize: 20, }}>{talk.title}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-evenly", paddingTop: 20, paddingBottom: 20 }}>
                <PressableIcon name={favorited ? "favorite" : "favorite-outline"}
                    onPress={async(e)=>{
                        try{
                            const localUri = `${FileSystem.documentDirectory}${talk.id}/.mp4'`
                            
                            if(favorited){
                                await FileSystem.deleteAsync(localUri, { idempotent: true });
                                return;
                            }else{
                                setDownloading(true);
                                const info = await FileSystem.getInfoAsync(localUri);
                                if (!info.exists) {
                                    await FileSystem.downloadAsync(talk.nativeDownloads.medium, localUri);
                                }
                                setDownloading(false)
                            }
                        }catch(e){
                            console.error(e)
                        }finally{
                            setDownloading(false)
                            toggleTalk("favorited")
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

