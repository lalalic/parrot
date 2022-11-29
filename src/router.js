import React from "react"
import { View } from "react-native"
import { NativeRouter, Route, Routes, Link, Outlet, useLocation} from "react-router-native"
import { MaterialIcons } from '@expo/vector-icons';

import Talks from "./talks"
import Account from "./account"
import Talk from "./talk"
import Policy from "./policy"
import Scheduler from "./plan"
import Explorer from "./file-explorer"
import { ColorScheme } from "./default-style"
import Home from "./home"
import ManageList from "./widgets/manage-list"
import ARTest from "./ar-test"

export default ({scheme=React.useContext(ColorScheme)})=>(
    <NativeRouter initialEntries={["/talk/matthew_garcia_how_global_virtual_communities_can_help_kids_achieve_their_dreams/shadowing"]}>
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
                        <Route path="files" element={<Explorer exclude={["appData"]} title="File Explorer"/>}/>
                        <Route path="artest" element={<ARTest/>}/>
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
            <Route element={React.createElement(()=><WithBackButton><Text>oops!</Text></WithBackButton>)}/>
        </Routes>
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
