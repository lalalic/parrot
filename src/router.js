import React from "react"
import { Switch } from "react-native"
import * as Linking from "expo-linking"
import WebView from "react-native-webview"
import { useDispatch, useSelector } from "react-redux"
import { Route, useLocation, useNavigate, useParams } from "react-router-native"

import Account from "react-native-use-qili/components/Account"
import Router from "react-native-use-qili/router"
import WithBackButton from "react-native-use-qili/components/WithBackButton"

import Home from "./home"
import Scheduler from "./plan"
import Talk from "./talk"
import Talks from "./talks"

import Favorites from "./account/favorites"
import Explorer from "./account/file-explorer"
import Lang from "./account/lang"
import Policy from "./account/policy"
import Test from "./account/test"

import { TalkApi } from "./store"

import TaggedTranscript from "./widgets/tagged-transcript"
import l10n from "./l10n"

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
            navs={[["/home","home"],["/plan","date-range"],["/account","account-circle"] ]}
            >
            <Route path="talks" element={<Talks/>} />
            <Route path="home" element={<Home/>} />

            <Route path="account">
                <Route path="" element={<Account l10n={l10n}
                    settings={[
                        {name:"Policy", icon:"policy"},
                        {name:"Favorites", icon:"favorite"},
                        {name:"Language", icon:"compass-calibration"}, 
                        {name:"Has ChatGPT Account?",  icon:"chat-bubble-outline", children: <SwitchChatGPT/>}
                    ]}
                    information={[
                        ...(__DEV__ ? [
                            {name:"Ted Service", icon:"electrical-services", children: <SwitchTed/>},
                            {name:"Files", icon:"file-present"},
                            {name:"Clear TalkApi", icon: "cleaning-services", onPress:e=>dispatch(TalkApi.util.resetApiState())},
                            {name:"Clear Talk", icon: "cleaning-services", onPress:e=>dispatch({type:"talk/clear/all"})},
                        ] : []).filter(a=>!!a),
                        {name:"Privacy Policy", icon:"privacy-tip", href:"/account/privacy"},
                        {name:"About", icon:"info-outline", href:"/account/about"},
                    ]}
                    />}/>
                <Route element={<WithBackButton/>}>
                    <Route path="policy" element={<Policy/>}/>
                    <Route path="favorites" element={<Favorites/>}/>
                    <Route path="language" element={<Lang/>}/>
                    <Route path="privacy" element={<WebView style={{flex:1}} source={{uri:"https://parrot.qili2.com/privacy.html"}}/>}/>
                    <Route path="about" element={<WebView style={{flex:1}} source={{uri:"https://parrot.qili2.com"}}/>}/>
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

function SwitchChatGPT(){
    const dispatch=useDispatch()
    const {widgets}=useSelector(state=>state.my)
    const {pathname}=useLocation()
    return (
        <Switch value={widgets.chatgpt} style={{transform:[{scale:0.5}], alignSelf:"center"}}
            onValueChange={e=>{
                dispatch({type:"my", payload:{sessions:{},widgets:{...widgets, chatgpt:!widgets.chatgpt}}})
                globalThis.lastPathName=pathname
            }}
            />
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