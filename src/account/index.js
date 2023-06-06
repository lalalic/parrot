import React from "react"
import {View, Text, Pressable, SectionList} from "react-native"
import { Link } from "react-router-native"
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from "react-redux";
import {Ted} from "../store"
import { Login } from "../components"

export default ()=>{
    const dispatch=useDispatch()
    const sections=[
        {title:"Settings", data:[
            {name:"Policy", icon:"policy"},
            {name:"Favorites", icon:"favorite"},
            {name:"Language", icon:"compass-calibration"}, 
        ]},
    ]
    const {admin}=useSelector(state=>state.my)
    if(!!admin){
        if(!admin.headers){
            return <Login/>
        }

        sections.push(
            {title:"Developer", data:[
                {name:"Admin", icon:"person-pin-circle", href:"/admin"},
                {name:"Test", icon:"file-present"},
                {name:"Files", icon:"file-present"},
                {name:"Clear Ted", icon: "cleaning-services", onPress:e=>dispatch(Ted.util.resetApiState())},
                {name:"Clear Talk", icon: "cleaning-services", onPress:e=>dispatch({type:"talk/clear/all"})},
            ]}
        )
    }
    
    return (
        <View style={{flex: 1,padding:4, paddingTop:20}}>
            <SectionList 
                keyExtractor={a=>a.name}
                renderSectionHeader={({ section: { title } }) => (
                    <Pressable style={{flex:1}} onLongPress={e=>{
                            dispatch({type:"my",payload:{admin: !admin ? {} : false}})
                            dispatch(Ted.util.resetApiState())
                        }}>
                        <Text style={{flex:1, fontSize:16, paddingTop:20, paddingLeft: 10}}>{title}</Text>
                    </Pressable>
                )}
                renderItem={({index:i,item:{name,icon, href=`/account/${name}`, onPress}})=>{
                    const content=(
                        <View style={{flexDirection:"row",width:"100%",height:50, paddingTop:5,paddingBottom:5, borderBottomWidth:1,borderColor:"gray"}}>
                            <MaterialIcons style={{paddingTop:5}} name={icon} size={30} />
                            <Text style={{flexGrow:1,marginLeft:4,paddingTop:12}}>{name}</Text>
                            {!onPress && <MaterialIcons style={{paddingTop:8}} name="keyboard-arrow-right"   />}
                        </View>
                    )
                    return onPress ? 
                        (<Pressable {...{children:content, onPress}}/>)
                        :(<Link to={href} children={content}/>)
                }} 
                sections={sections} /> 
        </View>
    )
}