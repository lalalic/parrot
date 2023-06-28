import React from "react";
import { View } from "react-native"
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link, Outlet, useLocation } from "react-router-native";

export default function WeNavigator({root=""}){
    const {pathname}=useLocation()
    return (
        <View style={{ flex: 1, paddingTop:50 }}>
            <Outlet />
            <View style={{ flexDirection: "row", justifyContent: "space-around",
                    position: "absolute", top:0, left: 0, width: "100%",height:50 
                    }}>
                {[
                    ["/wechat/monitor", "home"],
                    ["/wechat/contacts", "contacts"],
                    ["/wechat/schedule", "schedule"],
                    ["/wechat/setting", "settings"],
                ].map(([href, name, to=`${root}${href}`], i) => {
                    return (
                        <Link key={i} to={to} style={{ flex: 1, alignItems: "center", padding: 10 }}>
                            <MaterialIcons name={name} color={pathname==to ? "yellow" : "white"} />
                        </Link>
                    );
                })}
            </View>
        </View>
    )
}
