import React from "react"
import { Switch } from "react-native"
import * as FileSystem from "expo-file-system"
import { useDispatch, useSelector } from "react-redux"
import { Route, useParams } from "react-router-native"

import Account from "react-native-use-qili/components/Account"
import Router from "react-native-use-qili/router"
import { Reset, isAdmin } from "react-native-use-qili/store"
import WithBackButton from "react-native-use-qili/components/WithBackButton"
import Navigator from "react-native-use-qili/components/Navigator"

import Home from "./home"
import Scheduler from "./plan"
import Talk from "./talk"
import Talks from "./talks"

import Explorer from "./account/file-explorer"
import Lang from "./account/lang"
import Policy from "./account/policy"
import Test from "./account/test"

import { TalkApi } from "./store"

import TaggedTranscript from "./widgets/management/tagged-transcript"
import YoutubeShare from "./components/YoutubeShare"

export default function MyRouter(){
    const dispatch=useDispatch() 
    const [bAdmin, setIsAdmin]=React.useState(false)  
    React.useEffect(()=>{
        fetch("https://ted.com").then(async res=>{
            if(res.ok){
                setIsAdmin(await isAdmin())
            }else{
                dispatch({type:"my/api", api: "Qili"})
            }
        })
    },[]) 

    const root=(
        <>
            <Navigator navs={[["/home","home"],["/plan","date-range"],["/account","settings"] ]}/>
            <YoutubeShare/>
        </>
    )
    return (
        <Router initialEntries={["/home"]} root={root} >
            <Route path="talks" element={<Talks/>} />
            <Route path="home" element={<Home/>} />

            <Route path="account">
                <Route path="" element={<Account
                    settings={[
                        {name:"Policy", icon:"policy"},
                        {name:"Language", icon:"compass-calibration"}, 
                        bAdmin && {name:"Ted", icon:"electrical-services", children: <SwitchTed/>},
                    ].filter(a=>!!a)}
                    information={[
                        ...(__DEV__ ? [
                            {name:"Reset", icon:"settings", onPress:e=>dispatch(Reset)},
                            {name:"Files", icon:"file-present"},
                            {name:"Clear TalkApi", icon: "cleaning-services", onPress:e=>dispatch(TalkApi.util.resetApiState())},
                            {name:"Clear Talk", icon: "cleaning-services", onPress:e=>dispatch({type:"talk/clear/all"})},
                        ] : []).filter(a=>!!a),
                    ]}
                    onDeleteAccount={async ()=>{
                        const docs=await FileSystem.readDirectoryAsync(FileSystem.documentDirectory)
                        const accountData=docs.filter(a=>a.indexOf('.account.')!=-1)
                        const all=[]
                        for (const dir of accountData) {
                            all.push(FileSystem.deleteAsync(`${FileSystem.documentDirectory}${dir}`))
                        }
                        return Promise.all(all)
                    }}
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
                            return <TagManagement prompts={Widget.prompts}/>
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
            onValueChange={e=> dispatch({type:"my/api", api: api=="Ted" ? "Qili" : "Ted"})}
            />
    )
}
 
