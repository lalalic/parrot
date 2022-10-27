import React from 'react';
import {View, Text} from "react-native"
import { useParams } from 'react-router-native'
import Player from "./player"
import { PressableIcon, PolicyIcons, PlayButton } from './components';
import * as Print from "expo-print"
import {useSelector, useDispatch} from 'react-redux';
import * as FileSystem from 'expo-file-system';
import {Ted} from "./store"

export default function Talk({autoplay}){
    const Policy=useSelector(state=>state.policy)
    
    const {slug, policy="general"} = useParams();
    const {data:talk={}}=Ted.useTalkQuery(slug)
    const talkSetting=useSelector(state=>state.talks[talk.id])
    const talkPolicySetting=talkSetting?.[policy]
    
    const dispatch=useDispatch()
    const toggleTalk=(key,value)=>dispatch({type:"talk/toggle",id:talk.id, key,value, talk})
    
    const [downloading, setDownloading]=React.useState(false)
    
    return (
        <View style={{flex:1}}>
            <View style={{flex:1, flexGrow:1}}>
                <Player talk={talk} style={{flex:1, }} key={policy}
                    autoplay={autoplay} challenges={talkPolicySetting?.challenges} record={talkPolicySetting?.record}
                    policy={{...Policy.general,...Policy[policy],...talkSetting?.[policy]}}
                    onPolicyChange={changed=>talkSetting && toggleTalk(policy,changed)}
                    onRecordDone={record=>dispatch({type:"talk/recording",talk,id:talk.id, policy, record})}
                    onCheckChunk={chunk=>dispatch({type:"talk/challenge",talk,id:talk.id, policy, chunk})}
                    />
                

                {!!!autoplay && <View style={{flex:1, padding:5,}}>
                    <Text style={{fontSize:20, color:"white"}}>{talk.title}</Text>
                    <View style={{flexDirection:"row",justifyContent:"space-evenly", paddingTop:20,paddingBottom:20}}>
                        <PressableIcon name={talkSetting?.favorited ? "favorite": "favorite-outline"} 
                            onPress={e=>toggleTalk("favorited")}/>
                        <PressableIcon name={talkSetting?.downloaded ? "cloud-done": "cloud-download"} 
                            color={downloading ? "gray" : "white"}
                            onPress={async e=>{
                                if(downloading)
                                    return
                                const localUri=FileSystem.documentDirectory + talk.id+'.mp4'
                                if(talkSetting?.downloaded){
                                    //clear downloaded
                                    await FileSystem.deleteAsync(localUri,{idempotent:true})
                                    return 
                                }else{
                                    setDownloading(true)
                                    const info=await FileSystem.getInfoAsync(localUri)
                                    if(!info.exists){
                                        await FileSystem.downloadAsync(talk.nativeDownloads.medium,localUri)
                                    }
                                    setDownloading(false)
                                    toggleTalk("downloaded",localUri)
                                }
                            }}/>
                        <PressableIcon name="print" onPress={async e=>{
                            await Print.printAsync({
                                html:html(talk.paragraphs.map(a=>a.cues.map(b=>b.text).join("")).join("\n"))
                            })
                        }}/>
                        <PressableIcon name={PolicyIcons.shadowing} color={talkSetting?.shadowing ? "blue" : "white"} 
                            onPress={e=>toggleTalk("shadowing")}/>
                        <PressableIcon name={PolicyIcons.dictating} color={talkSetting?.dictating ? "blue" : "white"}
                            onPress={e=>toggleTalk("dictating")}/>
                        <PressableIcon name={PolicyIcons.retelling} color={talkSetting?.retelling ? "blue" : "white"}
                            onPress={e=>toggleTalk("retelling")}/>
                    </View>
                </View>}
            </View>

            <View style={{flexDirection: "row",justifyContent: "space-around"}}>
                <PlayButton/>
            </View>
        </View>
    )
}



const html=(transcript)=>`
    <html>
        <body>
            ${transcript}
        </body>
    </html>

`
