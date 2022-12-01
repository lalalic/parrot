import React from "react"
import {View, Text, Pressable, FlatList} from "react-native"
import { Link } from "react-router-native"
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch } from "react-redux";
import {Ted} from "./store"

export default ()=>{
    const dispatch=useDispatch()
    return (
        <View style={{flex: 1,padding:4, paddingTop:20}}>
            <FlatList keyExtractor={a=>a.name}
                renderItem={({index:i,item:{name,icon, href=`/account/${name}`}})=>(
                    <Link to={href}>
                        <View style={{flexDirection:"row",width:"100%",height:50, paddingTop:5,paddingBottom:5, borderBottomWidth:1,borderColor:"gray",borderTopWidth:!i&&1}}>
                            <MaterialIcons style={{paddingTop:5}} name={icon} size={30} />
                            <Text style={{flexGrow:1,marginLeft:4,paddingTop:12}}>{name}</Text>
                            <MaterialIcons style={{paddingTop:8}} name="keyboard-arrow-right"   />
                        </View>
                    </Link>
                )} 
                data={[
                    {name:"Policy", icon:"policy"},
                    {name:"Files", icon:"file-present"},
                    {name:"Artest", icon:"person-pin-circle"},
                ]} />     
            
            <Pressable 
                onPress={e=>{
                    dispatch(Ted.util.resetApiState())
                    /*
                    dispatch({type:"talk/clear/all"})
                    dispatch({type:"audiobook/clear"})
                    dispatch({type:"picturebook/clear"})
                    */
                }}
                style={{flexDirection:"row",width:"100%",height:50, paddingTop:5,paddingBottom:5, borderBottomWidth:1,borderColor:"gray",borderTopWidth:1}}>
                <MaterialIcons style={{paddingTop:5}} name={"cleaning-services"} size={30} />
                <Text style={{flexGrow:1,marginLeft:4,paddingTop:12}}>Clear Cache</Text>
                <MaterialIcons style={{paddingTop:8}} name="keyboard-arrow-right"   />
            </Pressable>
        </View>
    )
}