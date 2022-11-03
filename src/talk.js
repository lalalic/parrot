import React from 'react';
import {View, Text, StyleSheet} from "react-native"
import { useParams, Link } from 'react-router-native'
import Player, {NavBar, Subtitles, Challenges} from "./player"
import { PressableIcon, PolicyIcons, PlayButton } from './components';
import * as Print from "expo-print"
import {useSelector, useDispatch} from 'react-redux';
import * as FileSystem from 'expo-file-system';

import {Ted} from "./store"

export default function Talk({autoplay, policy="general", children}){
    const Policy=useSelector(state=>state.policy)
    
    const {slug} = useParams();
    const {data:talk={}}=Ted.useTalkQuery(slug)
    const talkSetting=useSelector(state=>state.talks[talk.id])
    const talkPolicySetting=talkSetting?.[policy]
    
    const dispatch=useDispatch()
    const toggleTalk=(key,value)=>dispatch({type:"talk/toggle",id:talk.id, key,value, talk})
    switch(policy){
        case "general":
            children=<TalkInfo {...{style:{ flex: 1, padding: 5, }, talk, talkSetting, toggleTalk}}/>
            break
        default:
            children=<Challenges {...{style:{flex:1, padding:5}}}/>
            break
    }
    return (
        <View style={{flex:1}}>
            <View style={{flex:1, flexGrow:1}}>
                <Player talk={talk} style={{flex:1, }} key={policy}
                    autoplay={autoplay} 
                    challenges={talkPolicySetting?.challenges} 
                    record={talkPolicySetting?.record}
                    policy={{...Policy.general,...Policy[policy],...talkSetting?.[policy]}}
                    onPolicyChange={changed=>toggleTalk(policy,changed)}
                    onCheckChunk={chunk=>dispatch({type:"talk/challenge",talk,id:talk.id, policy, chunk})}
                    onRecordChunkUri={({time,end})=>`${FileSystem.documentDirectory}${talk.id}/${policy}/audios/${time}-${end}`}
                    onRecordChunk={({chunk:{time,end},recognized})=>dispatch({type:"talk/recording",talk,id:talk.id, policy, record:{[`${time}-${end}`]:recognized}})}
                    onFinish={e=>{}}
                    >
                    {children}
                </Player>
            </View>
            <View style={styles.nav}>
                <PlayButton name="arrow-drop-up" showPolicy={true}/>
                <PressableIcon disabled={!talkPolicySetting}
                    name={talkPolicySetting ? (talkPolicySetting.records ? "delete" : "delete-forever") : "delete-outline"}
                    onPress={e=>dispatch({type:"talk/clear/policy/record",id:talk.id, talk, policy})}
                    onLongPress={e=>dispatch({type:"talk/clear/policy",id:talk.id, talk, policy})}
                    />
            </View>
        </View>
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
function TalkInfo({talk, talkSetting, toggleTalk, style}) {
    const [downloading, setDownloading]=React.useState(false)
    return (
        <View style={style}>
            <Text style={{ fontSize: 20, }}>{talk.title}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-evenly", paddingTop: 20, paddingBottom: 20 }}>
                <PressableIcon name={talkSetting?.favorited ? "favorite" : "favorite-outline"}
                    onPress={e => toggleTalk("favorited")} />
                <PressableIcon name={talkSetting?.downloaded ? "cloud-done" : "cloud-download"}
                    color={downloading ? "gray" : undefined}
                    onPress={async (e) => {
                        if (downloading)
                            return;
                        const localUri = FileSystem.documentDirectory + talk.id + '.mp4';
                        if (talkSetting?.downloaded) {
                            //clear downloaded
                            await FileSystem.deleteAsync(localUri, { idempotent: true });
                            return;
                        } else {
                            setDownloading(true);
                            const info = await FileSystem.getInfoAsync(localUri);
                            if (!info.exists) {
                                await FileSystem.downloadAsync(talk.nativeDownloads.medium, localUri);
                            }
                            setDownloading(false);
                            toggleTalk("downloaded", localUri);
                        }
                    } } />
                <PressableIcon name="print" onPress={async (e) => {
                    await Print.printAsync({
                        html: html(talk.paragraphs.map(a => a.cues.map(b => b.text).join("")).join("\n"))
                    });
                } } />

                {talkSetting && <PressableIcon name="delete"
                    onPress={e=>dispatch({type:"talk/clear",id:talk.id, talk, policy})}
                    />}
    
                {/*
                <PressableIcon name={PolicyIcons.shadowing} color={talkSetting?.shadowing ? "blue" : undefined}
                    onPress={e => toggleTalk("shadowing")} />
                <PressableIcon name={PolicyIcons.dictating} color={talkSetting?.dictating ? "blue" : undefined}
                    onPress={e => toggleTalk("dictating")} />
                <PressableIcon name={PolicyIcons.retelling} color={talkSetting?.retelling ? "blue" : undefined}
                    onPress={e => toggleTalk("retelling")} />
            */}
            </View>
            <View>
                <Text>{talk.description}</Text>
            </View>
        </View>
    )
}

