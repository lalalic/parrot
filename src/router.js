import React from "react"
import { SafeAreaView, StyleSheet, View} from "react-native"
import {NativeRouter, Route, Routes, Link, Outlet} from "react-router-native"
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from "expo-status-bar"

import Talks from "./daily-talks"
import Account from "./account"
import Talk from "./talk"
import Policy from "./policy"
import { PlayButton } from "./components"

export default ()=>(
    <NativeRouter>
        <SafeAreaView style={styles.container}>
                <Routes>
                    <Route path="/" element={React.createElement(({})=>(
                        <View style={{flex:1}}>
                            <View style={styles.content}>
                                <Outlet/>
                            </View>
                            <View style={styles.nav}>
                                <Link to="/" style={styles.navItem}>
                                    <MaterialIcons name="home" size={24} color="white"/>
                                </Link>
                                
                                <Link to="/plan" style={styles.navItem}>
                                    <MaterialIcons name="date-range" size={24} color="white"/>
                                </Link>
                
                                <Link to="/account" style={styles.navItem}>
                                    <MaterialIcons name="account-circle" size={24}  color="white"/>
                                </Link>
                            </View>
                        </View>
                    ))}>
                        <Route path="talks" element={<Talks/>} />
                        <Route path="account" element={<Account/>}/>
                        <Route path="account/policy" element={<Policy/>}/>
                    </Route>
                    <Route path="/talk/:slug" element={<Talk/>} />
                    <Route path="/talk/:slug/autoplay/:policy" element={<Talk autoplay={true}/>} />
                </Routes>
            <StatusBar style="light"/>
        </SafeAreaView>
    </NativeRouter>
)

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    content: {
        flexGrow: 1,
        flex:1,
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
    },
    text: {
      color: "white",
    }
  });