import React from "react"
import ProvideWeb from "../components/provider-web" 
import * as extension from "../../chrome-extension"

const {uris, services, subscriptAsHelper, ...Bros}=extension
const webviews=Object.entries(Bros).reduce((all, [id, bro])=>{
    const Context=React.createContext({})
    all[id]={
        Provider(props){
            return (
                <ProvideWeb id={id}
                    Context={Context}
                    uri={uris[id]}
                    bro={bro}
                    {...props}
                    >
                </ProvideWeb>
                )
        },
        
        useService(){
            return React.useContext(Context)
        }
    }

    return all
},{})

const proxies=Object.entries(services).reduce((all, [id, bro])=>{
    const Context=React.createContext({})
    all[id]={
        Provider(props){
            const banned={}
            const service=React.useMemo(()=>{
                if(banned){
                    return new Proxy({},{
                        get(target, fnKey){
                            return args=>Qili.askThenWaitAnswer({fnKey, args, $service: id})
                        }
                    })
                }
                return bro()
            },[banned])
            return (
                <Context.Provider value={{service}}
                    {...props}>
                </Context.Provider>
                )
        },
        
        useService(){
            return React.useContext(Context)
        }
    }

    return all
},{})


export default {
    ...webviews, 
    ...proxies, 
    subscriptAsHelper
}
