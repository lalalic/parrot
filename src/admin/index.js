import React from "react"
import Qili from "../experiment/qili"

import { FlyMessage, TalkSelector, Login } from "../components"
import { useDispatch, useSelector } from "react-redux"

export default function Admin(){
    const dispatch=useDispatch()
    const updateToken=React.useCallback(async admin=>{
        const data=await new Qili(admin).fetch({
            id:"authentication_renewToken_Query"
        })
            
        if(data?.me?.token){
            dispatch({type:"my",payload:{admin:{...admin,headers:{...admin.headers,"x-session-token":data.me.token}}}})
        }
    },[])
    const {admin}=useSelector(state=>state.my)
    React.useEffect(()=>{
        if(admin?.headers){
            (async ()=>{
                try{
                    updateToken(admin)
                }catch(e){
                    FlyMessage.error(e.message)
                    //bring us back to Login
                    dispatch({
                        type:"my",
                        payload:{admin:undefined}
                    })
                }
            })()
            
        }
    },[])

    if(!admin?.headers){
        return <Login/>
    }

    return (
        <TalkSelector horizontal={false} extraData={Date.now()}
            thumbStyle={{height:120,width:"48%"}}
            titleStyle={{height:40}}
            columnWrapperStyle={{justifyContent:"space-between"}}
            numColumns={2}>
        </TalkSelector>
    )
}


