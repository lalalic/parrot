import React from "react";

import Setting from "./setting"
import Monitor from "./monitor"
import Schedule from "./schedule";

import Contacts from "./contacts";
import WeChatProvider from "./provider"
import { useWeChat } from "./use-wechat";
import Navigator from "./navigator";


export default function Test({children=<Monitor/>}){
    return (
        <WeChatProvider debug={false}>
            <Navigator root="/account"/>
        </WeChatProvider>
    )
}

export {WeChatProvider, useWeChat, Setting, Monitor, Contacts, Schedule, Navigator}