import React from "react"
import { Pressable, View, FlatList, TextInput, Text, Switch } from "react-native"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-native"

export default function WeChatSetting({}){
    const dispatch=useDispatch()
    const navigate=useNavigate()
    const {key, roles=[], scenarioes, keyImage, ...state}=useSelector(state=>state.wechat)

    const nameScenarioes=React.useMemo(()=>Object.keys(scenarioes),[scenarioes])
    const [current, setCurrent]=React.useState("")
    const labelStyle={justifyContent:"center",padding:5, fontSize:20}
    const inputStyle={borderWidth:1, borderBottomColor:"gray", color:"yellow", padding:5}
    return (
        <View style={{flex:1}}>
            <View style={{ alignItems:"center",marginBottom:20}}>
                <Text style={{fontSize:20}}>
                    Autobot Profile
                </Text>
            </View>
            <View style={{width:"100%", flexDirection:"row", 
                justifyContent:"space-around", 
                borderBottomWidth:1, borderColor:"gray", 
                marginBottom:5,
                paddingBottom:5,
                }}>
                {"Self,Schedule,Scenario,Role".split(",").map(k=>
                    <View key={k} style={{flex:1, alignItems:"center"}}>
                        {k!=="Schedule" ? 
                            <Text>{k.toLowerCase()}</Text> : 
                            <Pressable onPress={e=>navigate("/account/wechat/schedule")} style={{flex:1}}>
                                <Text style={{color:"blue"}}>{k.toUpperCase()}</Text>
                            </Pressable>
                        }
                        <Switch style={{ transform: [{ scale: 0.6 }] }}
                            value={state[`enable${k}`]} 
                            onValueChange={e=>dispatch({type:"wechat/toggle", key: k})}
                            />
                    </View>
                )}
            </View>

            <View style={{height:80, marginBottom:10}}>
                <View style={[labelStyle, {flexDirection:"row", alignItems:"baseline"}]}>
                    <Text style={{width:100}}>Ask chatgpt:</Text>
                    <TextInput style={[inputStyle,{flexGrow:1,marginLeft:50, marginRight:50}]} defaultValue={key}/>
                </View>

                <View style={[labelStyle, {flexDirection:"row", alignItems:"baseline"}]}>
                    <Text style={{width:100}}>Request image:</Text>
                    <TextInput style={[inputStyle,{flexGrow:1,marginLeft:50, marginRight:50}]} defaultValue={keyImage}/>
                </View>
            </View>
            

            <View style={{height:100, marginBottom:10}}>
                <View style={labelStyle}><Text>Roles: Potential roles of yourself and contacts</Text></View>
                <TextInput style={[inputStyle,{flexGrow:1}]} 
                    defaultValue={roles.join(",").trim()} 
                    numberOfLines={3}
                    multiline={true}
                    onEndEditing={e=>{
                        const roles=e.nativeEvent.text.split(",").map(a=>a.trim()).filter(a=>!!a)
                        dispatch({type:"wechat/roles", roles})
                    }}
                    />
            </View>

            <View style={{flexGrow:1}}>
                <View style={labelStyle}><Text>Scenarioes (Name: key1, key2)</Text></View>
                <TextInput style={[inputStyle,{height:50}]} 
                    defaultValue={`${current ? `${current} : ` : ""}${scenarioes[current]?.join?.(", ")||""}`} 
                    multiline={true}
                    numberOfLines={2}
                    onEndEditing={e=>{
                        const [name="", desc=""]=e.nativeEvent.text.split(":").map(a=>a.trim())
                        const keys=desc.split(",").map(a=>a.trim()).filter(a=>!!a)
                        if(name && keys.length>0){
                            dispatch({type:"wechat/scenario", current, name, keys})
                            setCurrent(name)
                        }
                    }}
                    />
                <FlatList style={{flexGrow:1}}
                    data={nameScenarioes}
                    extraData={current}
                    keyExtractor={item=>`${item}-${current}`}
                    renderItem={({item})=>(
                        <Pressable style={{
                                paddingLeft:5, height:50, 
                                backgroundColor: current==item ? "lightgray" : "transparent",
                                justifyContent:"center",
                            }} 
                            onLongPress={e=>dispatch({type:"wechat/delete/scenario", name:item})}
                            onPress={e=>setCurrent(current==item ? "" : item)} >
                            <Text style={{color:"yellow"}}>{item}</Text>
                        </Pressable>
                    )}
                    />
            </View>
        </View>
    )
}