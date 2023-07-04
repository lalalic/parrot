import React from 'react';
import { useSelector } from "react-redux";
import { Qili } from '../store';
import services from "./webview-services"
import usePersistAccessToken from "react-native-chatgpt/lib/commonjs/hooks/usePersistAccessToken"

export function SubscribeHelpQueue({children}){
    const {accessToken}=usePersistAccessToken()
    const $chatgptAccessToken=React.createRef(accessToken)
    $chatgptAccessToken.current=accessToken

    const {helper}=useSelector(({ my:{uuid:helper},  })=>({helper}))

    React.useEffect(()=>{
        const empty=()=>({})
        const proxy=new Proxy({},{get:(_,key)=>empty})
        const chrome={
            tabs:proxy,
            browserAction:proxy,
            storage:{
                sync:{
                    get(type, callback){
                        callback?.(0)
                    },
                    set(){

                    }
                }
            },
            runtime:{
                onMessage:proxy,
                onStartup:proxy,
                onInstalled:proxy,
            }
        }

        const window={}
        services.subscriptAsHelper({helper,Qili, chrome, window})
        window.bros.chatgpt.getToken=()=>{
            return $chatgptAccessToken.current.split(" ")[1]
        }
    },[])

    return children
}


