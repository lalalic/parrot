import React from "react"
import { Switch } from "react-native"
import * as Linking from "expo-linking"
import { useDispatch, useSelector } from "react-redux"
import { Route, useNavigate, useParams } from "react-router-native"

import Account from "react-native-use-qili/components/Account"
import { SwitchChatGPT } from "eact-native-use-qili/components/ChatProvider"
import Router from "react-native-use-qili/router"
import { Reset } from "react-native-use-qili/store"
import WithBackButton from "react-native-use-qili/components/WithBackButton"

import Home from "./home"
import Scheduler from "./plan"
import Talk from "./talk"
import Talks from "./talks"

import Explorer from "./account/file-explorer"
import Lang from "./account/lang"
import Policy from "./account/policy"
import Test from "./account/test"

import { TalkApi } from "./store"

import TaggedTranscript from "./widgets/tagged-transcript"

export default function MyRouter(){
    const dispatch=useDispatch()
    const initialEntries=React.useMemo(()=>{
        const entries=["/home"]
        if(globalThis.lastPathName){//chatgpt switch lead to different parent
            entries.push(globalThis.lastPathName)
            delete globalThis.lastPathName
        }
        return entries
    },[])
    
    return (
        <Router initialEntries={initialEntries} 
            navs={[["/home","home"],["/plan","date-range"],["/account","settings"] ]}
            >
            <Route path="talks" element={<Talks/>} />
            <Route path="home" element={<Home/>} />

            <Route path="account">
                <Route path="" element={<Account
                    settings={[
                        {name:"Policy", icon:"policy"},
                        {name:"Language", icon:"compass-calibration"}, 
                        {name:"Has ChatGPT Account?",  icon:"chat-bubble-outline", children: <SwitchChatGPT/>},
                        {name:"Ted", icon:"electrical-services", children: <SwitchTed/>},
                    ]}
                    information={[
                        ...(__DEV__ ? [
                            {name:"Reset", icon:"settings", onPress:e=>dispatch(Reset)},
                            {name:"Files", icon:"file-present"},
                            {name:"Clear TalkApi", icon: "cleaning-services", onPress:e=>dispatch(TalkApi.util.resetApiState())},
                            {name:"Clear Talk", icon: "cleaning-services", onPress:e=>dispatch({type:"talk/clear/all"})},
                        ] : []).filter(a=>!!a),
                    ]}
                    />}/>
                <Route element={<WithBackButton/>}>
                    <Route path="policy" element={<Policy/>}/>
                    <Route path="language" element={<Lang/>}/>
                    
                    {__DEV__ &&(
                        <>
                            <Route path="files" element={<Explorer exclude={["appData"]} title="File Explorer"/>}/>
                            <Route path="test" element={<Test/>}/>
                        </>
                    )}
                </Route>
            </Route>

            <Route path="plan" element={<Scheduler/>}/>

            <Route path="/talk" element={<WithBackButton/>}>
                <Route path=":slug" element={<Talk/>}/>
                <Route path=":slug/:policy" element={<Talk/>}/>
                <Route path=":slug/:policy/:id" element={<Talk/>}/>
            </Route>

            <Route path="/widget" element={<WithBackButton/>}>
                <Route path=":slug" element={React.createElement(()=>{
                        const {slug,}=useParams()
                        const Widget=globalThis.Widgets[slug]
                        if(!Widget)
                            return null
                        
                        if(Widget.TagManagement){
                            const TagManagement=Widget.$TagManagement || (Widget.$TagManagement=Widget.TagManagement.bind(Widget))
                            return <TagManagement/>
                        }

                        return <Widget/>
                    })} 
                />

                <Route path=":slug/:id" element={<TaggedTranscript/>}/>
            </Route>
        </Router>
    )
}

function SwitchTed(){
    const dispatch=useDispatch()
    const {api}=useSelector(state=>state.my)
    
    return (
        <Switch value={api=="Ted"} style={{transform:[{scale:0.5}], alignSelf:"center"}}
            onValueChange={e=>{
                dispatch({type:"my/api", api: api=="Ted" ? "Qili" : "Ted"})
                dispatch({type:"qili/resetApiState"})
            }}
            />
    )
}
 
function ShareMointor(){
    //Linking.useURL()//
    const url="parrot://share/?url=https://www.youtube.com/watch?v=gOqitVsRYRE"
    const navigate=useNavigate()
    const getVideoId=React.useCallback(url=>{
        url=url.split("?url=")[1]
        const parsed=Linking.parse(decodeURIComponent(url))
        if(!["youtu.be","www.youtube.com","youtube.com"].includes(parsed.hostname))
            return 
        return parsed.queryParams.v || parsed.path
    },[])
    React.useEffect(()=>{
        if(!url)
            return
        const videoId=getVideoId(url)
        if(!videoId)
            return 
        navigate(`/talk/youtube/general/${videoId}`)
    },[])
    return null
}