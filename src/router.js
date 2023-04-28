import React from "react"
import { View } from "react-native"
import { NativeRouter, Route, Routes, Link, Outlet, useLocation, useParams} from "react-router-native"
import { MaterialIcons } from '@expo/vector-icons';

import Talks from "./talks"
import Talk from "./talk"
import Scheduler from "./plan"

import Account from "./account"
import Explorer from "./account/file-explorer"
import Policy from "./account/policy"
import Favorites from "./account/favorites"

import { ColorScheme } from "./components/default-style"
import Home from "./home"
import ManageList from "./widgets/manage-list"
import ARTest from "./experiment/ar-test"
import TTS from "./experiment/tts"

export default ({scheme=React.useContext(ColorScheme)})=>(
    <NativeRouter initialEntries={["/home"]}>
        <Routes>
            <Route path="/" element={React.createElement(()=>{
                    const {pathname}=useLocation()
                    return (
                        <View style={{flex:1}}>
                            <View style={{flexGrow: 1,flex:1}}>
                                <Outlet/>
                            </View>
                            <View style={{flexDirection: "row", justifyContent: "space-around",}}>
                                {[["/home","home"],["/plan","date-range"],["/account","account-circle"]].map(([to,name])=>{
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
                <Route path="home" element={<Home/>} />
                <Route path="account">
                    <Route path="" element={<Account/>}/>
                    <Route element={<WithBackButton/>}>
                        <Route path="policy" element={<Policy/>}/>
                        <Route path="favorites" element={<Favorites/>}/>
                        <Route path="files" element={<Explorer exclude={["appData"]} title="File Explorer"/>}/>
                        <Route path="artest" element={<ARTest/>}/>
                        <Route path="tts" element={<TTS/>}/>
                    </Route>
                </Route>
                <Route path="plan" element={<Scheduler/>}/>
            </Route>

            <Route path="/talk" element={<WithBackButton/>}>
                <Route path=":slug" element={<Talk/>} />
                <Route path=":slug/:policy" element={<Talk/>} />
                <Route path=":slug/:policy/:id" element={<Talk/>}/>
                <Route path="manage/:slug" element={<ManageList/>} />
            </Route>
            <Route path="/widget" element={<WithBackButton/>}>
                <Route path=":slug" element={React.createElement(()=>{
                        const {slug}=useParams()
                        const Widget=globalThis.Widgets[slug]
                        return Widget && <Widget/>
                    })} 
                />
            </Route>
            <Route element={React.createElement(()=><WithBackButton><Text>oops!</Text></WithBackButton>)}/>
        </Routes>
    </NativeRouter>
)

const WithBackButton=()=>(
    <View style={{flex:1}}>
        <Outlet/>
        <Link to={-1} style={{position:"absolute",left:10}}>
            <MaterialIcons name="keyboard-arrow-left"  size={32}/>
        </Link>
    </View>
)
