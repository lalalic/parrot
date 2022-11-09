import React from "react"
import { SafeAreaView, View} from "react-native"
import {NativeRouter, Route, Routes, Link, Outlet, useLocation} from "react-router-native"
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from "expo-status-bar"
import * as FileSystem from "expo-file-system"

import Talks from "./talks"
import Account from "./account"
import Talk from "./talk"
import Policy from "./policy"
import Scheduler from "./plan"
import Test from "./playground"
import Explorer from "./file-explorer"
import { ColorScheme } from "./default-style";


export default ({scheme=React.useContext(ColorScheme)})=>(
    <NativeRouter initialEntries={["/account"]}>
        <SafeAreaView style={{flex:1, backgroundColor:scheme.backgroundColor}}>
            <Routes>
                <Route path="/" element={React.createElement(()=>{
                        const {pathname}=useLocation()
                        return (
                            <View style={{flex:1}}>
                                <View style={{flexGrow: 1,flex:1}}>
                                    <Outlet/>
                                </View>
                                <View style={{flexDirection: "row", justifyContent: "space-around",}}>
                                    {[["/talks","home"],["/plan","date-range"],["/account","account-circle"]].map(([to,name])=>{
                                        return (
                                            <Link key={name} to={to} style={{flex: 1,alignItems: "center", padding: 10}}>
                                                <MaterialIcons name={name} color={pathname.startsWith(to) ? scheme.active : undefined}/>
                                            </Link>
                                        )
                                    })}
                                </View>
                            </View>
                        )
                    })}>
                        
                    <Route path="talks" element={<Talks/>} />
                    <Route path="account">
                        <Route path="" element={<Account/>}/>
                        <Route element={<WithBackButton/>}>
                            <Route path="policy" element={<Policy/>}/>
                            <Route path="files" element={<Explorer dir={FileSystem.cacheDirectory} exclude={["appData"]} title="File Explorer"/>}/>
                        </Route>
                    </Route>
                    <Route path="plan" element={<Scheduler/>}/>
                    <Route path="test" element={<Test/>}/>
                </Route>

                <Route path="/talk" element={<WithBackButton/>}>
                    <Route path=":slug">
                        <Route path="" element={<Talk/>} />
                        <Route path=":policy" element={<Talk {...{autoplay:true}}/>}/>
                    </Route>
                </Route>
                <Route element={React.createElement(()=><WithBackButton><Text>oops!</Text></WithBackButton>)}/>
            </Routes>
            <StatusBar style="light"/>
        </SafeAreaView>
    </NativeRouter>
)

const WithBackButton=()=>(
    <View style={{flex:1}}>
        <Outlet/>
        <View style={{position:"absolute",left:10}}>
            <Link to={-1}>
                <MaterialIcons name="keyboard-arrow-left"  size={32}/>
            </Link>
        </View>
    </View>
)