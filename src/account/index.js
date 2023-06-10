import React, { useDebugValue } from "react"
import {View, Text, Pressable, SectionList, Switch} from "react-native"
import { Link } from "react-router-native"
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from "react-redux";
import { TalkApi, isAdmin, isAdminLogin} from "../store"
import { Login } from "../components"

export default ()=>{
    const dispatch=useDispatch()
    const {widgets, api}=useSelector(state=>state.my)
    const sections=[
        {title:"Settings", data:[
            {name:"Policy", icon:"policy"},
            {name:"Favorites", icon:"favorite"},
            {name:"Language", icon:"compass-calibration"}, 
            {name:"Has ChatGPT Account?", 
                icon:"chat-bubble-outline", 
                children: <Switch 
                    value={widgets.chatgpt} 
                    onValueChange={e=>dispatch({type:"my", payload:{widgets:{...widgets, chatgpt:!widgets.chatgpt}}})}
                    />
            }
        ]},
    ]
    const [bAdmin, bAdminLogin]=useSelector(state=>[isAdmin(state), isAdminLogin(state)])
    if(bAdmin){
        if(!bAdminLogin){
            return <Login/>
        }
        sections[0].data.push({
            name:"Ted Service", 
            icon:"electrical-services", 
            children: <Switch 
                value={api=="Ted"} 
                onValueChange={e=>{
                    dispatch({type:"my/api", api: api=="Ted" ? "Qili" : "Ted"})
                    dispatch({type:"qili/resetApiState"})
                }}
                />
        })

        sections.push(
            {title:"Developer", data:[
                /*{name:"Test", icon:"file-present"},*/
                {name:"Admin", icon:"person-pin-circle", href:"/admin"},
                {name:"Files", icon:"file-present"},
                globalThis.logFile ? {name:"Logs", icon: "av-timer"} : false,
                {name:"Clear TalkApi", icon: "cleaning-services", onPress:e=>dispatch(TalkApi.util.resetApiState())},
                {name:"Clear Talk", icon: "cleaning-services", onPress:e=>dispatch({type:"talk/clear/all"})},
            ].filter(a=>!!a)}
        )
    }

    sections[0].data.push({
        name:"About", 
        icon:"info-outline"
    })
    
    return (
        <View style={{flex: 1,padding:4, paddingTop:20}}>
            <SectionList 
                keyExtractor={a=>a.name}
                renderSectionHeader={({ section: { title } }) => (
                    <Pressable style={{flex:1}} onLongPress={e=>{
                            dispatch({type:"my",payload:{admin: !bAdmin ? {} : false}})
                        }}>
                        <Text style={{flex:1, fontSize:16, paddingTop:20, paddingLeft: 10}}>{title}</Text>
                    </Pressable>
                )}
                renderItem={({index:i,item:{name,icon, href=`/account/${name}`, onPress, children}})=>{
                    const content=(
                        <View style={{flexDirection:"row",width:"100%",height:50, paddingTop:5,paddingBottom:5, borderBottomWidth:1,borderColor:"gray"}}>
                            <MaterialIcons style={{paddingTop:5}} name={icon} size={30} />
                            <Text style={{flexGrow:1,marginLeft:4,paddingTop:12}}>{name}</Text>
                            {children || <MaterialIcons style={{paddingTop:8}} name="keyboard-arrow-right"   />}
                        </View>
                    )
                    return onPress ? 
                        (<Pressable {...{children:content, onPress}}/>)
                        :(!!!children ? <Link to={href} children={content}/> : content)
                }} 
                sections={sections} /> 
        </View>
    )
}