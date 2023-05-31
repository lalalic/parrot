import React from "react"
import { View, TextInput, Button } from "react-native"
import Qili from "../experiment/qili"

import { FlyMessage, TalkSelector } from "../components"
import { useDispatch, useSelector } from "react-redux"

export default function Admin(){
    const dispatch=useDispatch()
    const updateToken=React.useCallback(async admin=>{
        const data=await new Qili(admin).fetch({
            id:"updateToken",
            query:`query {
                me{
                    token
                }
            }`
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


function Login({}){
    const dispatch=useDispatch()
    const [contact, setContact]=React.useState("")
    const [authReady, setAuthReady]=React.useState(false)
    const [code, setCode]=React.useState("")
    const [tick, setTick]=React.useState()

    const startTick=React.useCallback(()=>{
        let i=60, doTick;
        const timer=setInterval(doTick=()=>{
            if(i==0){
                clearInterval(timer)
                setTick(0)
            }else
                setTick(i--)
        },1000);

        doTick()
    },[])

    const requestCode=React.useCallback(async contact=>{
        try{
            const data=await new Qili().fetch({
                id:"requestToken",
                query:`mutation requestCode($contact:String!){
                    requestToken(contact:$contact)
                }`,
                variables:{
                    contact
                }
            })
            setAuthReady(!!data.requestToken)
            if(!!data.requestToken){
                startTick()
            }
        }catch(e){
            FlyMessage.error(e.message)
        }
    },[])

    const login=React.useCallback(async ({contact, code})=>{
        try{
            const data=await new Qili().fetch({
                id:"login",
                query:`mutation login($contact:String!,$token: String!, $name: String){
                    login(contact:$contact, token:$token, name:$name){
                        token
                    }
                }`,
                variables:{
                    contact,
                    token:code,
                    name:"admin"
                }
            })
            
            dispatch({
                type:"my",
                payload:{
                    admin:{
                        contact,
                        headers:{
                            "x-session-token":data.login.token,
                        }
                    }
                }
            })
        }catch(e){
            FlyMessage.error(e.message)
        }
    },[])

    const textStyle={height:40, fontSize:20, borderWidth:1, borderColor:"gray", padding:4}
    
    return (
        <View style={{backgroundColor:"white", padding:10, paddingTop:50}}>
            <View style={{flexDirection:"row", height:40}}>
                <TextInput style={{flex:1, ...textStyle}} 
                    editable={!tick}
                    value={contact}
                    placeholder="Phone Number" 
                    onChangeText={text=>setContact(text)}
                    />
                <Button style={{width:500}} 
                    disabled={!!tick}
                    onPress={e=>requestCode(contact)}
                    title={tick ? tick+"" : (tick===0 ? "Re-Request" : "Request Code")}
                    />
            </View>

            <TextInput value={code} style={{...textStyle, marginTop:20, marginBottom:20}}
                editable={!!authReady} 
                placeholder="Verification Code" 
                onChangeText={text=>setCode(text)}/>

            <Button title="Login" 
                disabled={!authReady}
                onPress={e=>login({contact, code})}
                />
        </View>
    )
}


