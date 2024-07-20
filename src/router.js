import React from "react"
import {Platform} from "react-native"
import * as FileSystem from "expo-file-system"
import { useDispatch } from "react-redux"
import { Route, useParams } from "react-router-native"

import Account from "react-native-use-qili/components/Account"
import Router from "react-native-use-qili/router"
import { Reset } from "react-native-use-qili/store"
import WithBackButton from "react-native-use-qili/components/WithBackButton"
import Paywall from "react-native-use-qili/components/Paywall-Topup"
import PaymentLink from "react-native-use-qili/components/PaymentLink"
import Balance from "react-native-use-qili/components/Balance"


import TestSuite from "react-native-use-qili/components/test-suite"

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
import PlanPlayer from "./components/PlanPlayer"

export default function MyRouter(){
    const dispatch=useDispatch() 
    const pay=Platform.select({
        ios:"paywall",
        android: "paylink"
    })
    return (
        <Router initialEntries={["/home"]}
            navs={[["/home","home"],["/plan","date-range"],["/account","settings"] ]}
            >
            <Route path="talks" element={<Talks/>} />
            <Route path="home" element={<Home/>} />

            <Route path="account">
                <Route path="" element={<Account
                    settings={[
                        {name:"Policy", icon:"policy"},
                        {name:"Language", icon:"compass-calibration"}, 
                        {name:"Topup", icon:"shopping-cart", href:`/account/${pay}`, children:<Balance />},
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
                    <Route path="paywall" element={<Paywall sku="topup1"/>}/>
                    <Route path="paylink" element={<PaymentLink urlForPaylink="https://ai.qili2.com/paymentLink"/>}/>
                    
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
                <Route path=":slug/:policy/:id/autoplay" element={<Talk autoplay={true}/>}/>
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

            <Route path="test">
                <Route path="predict" element={<TestSuite fixture={React.lazy(()=>import("./tests/predict"))}/>}/>
            </Route>

            <YoutubeShare/>
            <PlanPlayer style={{position:"absolute", top:350, right:10, zIndex:999}}/>
        </Router>
    )
}
