import React from "react"
import { SafeAreaView, StyleSheet, View} from "react-native"
import {NativeRouter, Route, Routes, Link, Outlet, useLocation} from "react-router-native"
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from "expo-status-bar"

import Talks from "./daily-talks"
import Account from "./account"
import Talk from "./talk"
import Policy from "./policy"
import Plan from "./plan"
//import Test from "./test"
const Test=()=><View/>

export default ()=>(
    <NativeRouter>
        <SafeAreaView style={[styles.container,{backgroundColor:"black"}]}>
            <Routes>
                <Route path="/"
                    element={React.createElement(()=>{
                        
                        return (
                            <View style={{flex:1}}>
                                <View style={styles.content}>
                                    <Outlet/>
                                </View>
                                <View style={styles.nav}>
                                    <Link to="/" style={styles.navItem}>
                                        <MaterialIcons name="home"/>
                                    </Link>
                                    
                                    <Link to="/plan" style={styles.navItem}>
                                        <MaterialIcons name="date-range"/>
                                    </Link>
                    
                                    <Link to="/account" style={styles.navItem}>
                                        <MaterialIcons name="account-circle"/>
                                    </Link>

                                    <Link to="/test" style={styles.navItem}>
                                        <MaterialIcons name="bug-report"/>
                                    </Link>
                                </View>
                            </View>
                        )
                    })}>
                        
                    <Route path="" element={<Talks/>} />
                    <Route path="account" element={<Account/>}/>
                    <Route path="plan" element={<Plan/>}/>
                    <Route element={<WithBackButton/>}>
                        <Route path="account/policy" element={<Policy/>}/>
                    </Route>
                    <Route path="test" element={<Test/>}/>
                </Route>

                <Route path="/talk" element={<WithBackButton/>}>
                    <Route path=":slug">
                        <Route path="" element={<Talk/>} />
                        <Route path="autoplay/:policy" element={<Talk autoplay={true}/>} />
                    </Route>
                </Route>
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

export const styles = StyleSheet.create({
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