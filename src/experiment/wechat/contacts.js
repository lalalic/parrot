import React from "react";
import { SectionList, Button, Text, View, TextInput, Pressable, ImageBackground, Modal, FlatList, DeviceEventEmitter } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useWeChat, getContactGroup, sortGroup, BandGroup } from "./use-wechat";
import PressableIcon from "use-qili/components/PressableIcon";
import useStateGlobalSwitch from "use-qili/components/useStateGlobalSwitch";
import Loading from "use-qili/components/Loading";
import Avarta from "./avarta";

export default function ContactList() {
    const { service } = useWeChat();
    
    const [contacts, setContacts] = React.useState([]);
    const [q, setSearch] = React.useState("");
    const [current, setCurrent]=React.useState("")
    React.useEffect(() => {
        (async () => {
            const getAllContacts=async ()=>Object.values(await service["glue.contactFactory.getAllContacts"]());
            setContacts(await getAllContacts())
            service.on('addContacts',async()=>{
                setContacts(await getAllContacts())
            })
        })();
    }, [])

    const sections=React.useMemo(()=>{
        const grouped=contacts.reduce((sec, a) => {
            const group = getContactGroup(a)
            ;(sec[group] = sec[group] || []).push(a);
            return sec;
        }, {})
        delete grouped[BandGroup]
        return Object.keys(grouped)
            .map(key => ({ 
                group: key, 
                data: grouped[key]
            }))
            .sort(sortGroup)
    },[contacts])

    const data = React.useMemo(() => {
        const filter=(regex=>({ name }) => regex.test(name))(q && new RegExp(q,"i"))
        return sections.map(({group,data})=>{
            return {
                group, count:data.length,
                data: current==group ? (!q ? data : data.filter(filter)) : []
            }
        })
    }, [q, sections, current])

    const [content, setContent]=React.useState(null)

    return (
        <View style={{ flex: 1, height: 50 }}>
            <TextInput style={{ color:"white", height: 50, borderWidth: 1, borderColor: "gray", padding: 5, marginBottom: 5 }} 
                value={q} placeholder="search:all your contacts" placeholderTextColor={"gray"}
                onChangeText={q => setSearch(q)} />
            {contacts.length==0 && <Loading/>}
            <SectionList sections={data} key={current}
                extraData={q}
                keyExtractor={a => a.id}
                renderSectionHeader={({ section:{group, count} }) => (
                    <Pressable style={{
                        flexDirection:"row", 
                        alignItems:"center",
                        height: 50,  
                        paddingLeft: 10, 
                        borderBottomWidth:3, borderColor:"gray", 
                        //backgroundColor:"#819191" 
                        }}
                        onPress={e=>setCurrent(current==group ? "" : group)}
                        >
                        <Text style={{fontSize:20}}>{group}</Text>
                        <Text style={{fontSize:10, color:"yellow"}}>{count}</Text>
                    </Pressable>
                )}

                renderItem={({ item}) => {
                    const { thumb, name, id, isRoomContact}=item
                    return (
                        <Pressable 
                            onPress={e=>setContent(<Policy {...{id,name: `${isRoomContact ? "其他人" : name}的`}}/>)}   
                            style={{ flex: 1, flexDirection: "row", alignItems:"center", justifyContent: "center", height: 50 }}>
                            <Avarta user={item} size={45}/>
                            <Text contact={id} style={{ flexGrow: 1 }} children={name} />
                            <PressableIcon name="keyboard-arrow-right" size={50} 
                                onPress={e=>setContent(<Policy {...{id,name: `${isRoomContact ? "其他人" : name}的`}}/>)}
                                />
                        </Pressable>
                    );
                }} />

                <Modal visible={!!content} 
                    animationType="slide"
                    transparent={true}
                    onRequestClose={e=>setContent(null)}
                    style={{margin:20,}}>
                    <View style={{
                        flex:1, backgroundColor:"white", marginTop:200,padding:5,
                        alignItems:"center", justifyContent:"center",width:"100%"}}>
                        <View style={{width:"100%"}}>
                            {content}
                            <Button title="退出" onPress={e=>setContent(null)}/>
                        </View>
                    </View>
                </Modal>
        </View>
    )
}

function Policy({id, name}){
    const dispatch=useDispatch()

    const {policy, roles, scenarioes}=useSelector(({wechat:{me, roles, scenarioes,policy:{[id]:policy}}}) => ({me, policy, roles, scenarioes}))
    return (
        <View style={{height:400, width:"100%", flexDirection:"column", justifyContent:"space-around"}}>
            <InputSelector title="我的角色" value={policy?.me} data={roles}
                multiline={true} numberOfLines={2} style={{height:50}}
                onChange={role=>dispatch({type:"wechat/contact/role", contact:id, target:'me', role})}/>

            <InputSelector title={name} value={policy?.["*"]} data={roles}
                multiline={true} numberOfLines={2} style={{height:50}}
                onChange={role=>dispatch({type:"wechat/contact/role", contact:id, target:"*", role})}/>

            <InputSelector title="可能的场景" value={policy?.scenarioes} data={Object.keys(scenarioes)}
                multiline={true} numberOfLines={3} style={{height:80}}
                onChange={scenarioes=>dispatch({type:"wechat/contact/scenarioes", contact:id, scenarioes})}/>
        </View>
    )
}



const InputSelector=(()=>{
    let uuid=Date.now()
    function InputSelector({ value="", title, data, style, itemStyle={ height:30}, onChange, ...props }) {
        
        const [selecting, toggleSelecting]=useStateGlobalSwitch("InputSelector",false)

        const current=React.useMemo(()=>value.split(",").filter(a=>!!a), [value])
        const {color, fontSize, height=30}=itemStyle||{}
        return (
            <View style={[{flex:1, width:"100%", marginBottom:20}]}>
                <Text style={{fontSize:16, color:"black", paddingLeft:5}}>{title}</Text>
                <TextInput defaultValue={value} 
                    style={[{padding:2, width: "100%", borderWidth:1, borderColor:"black" },style]}
                    onEndEditing={e => onChange?.(e.nativeEvent.text)} 
                    {...props}
                    />
                <PressableIcon name="more" 
                    style={{position:"absolute", top:20, right:5}}
                    onPress={e=>toggleSelecting()}/>
                {selecting && (
                    <FlatList 
                        data={data}
                        extraData={value}
                        style={[{
                            borderWidth:1, borderColor:"gray", backgroundColor:"white",
                            position:"absolute", top:45, right:5, width:200, 
                            height: height*Math.max(2,Math.min(5,data.length))}, 
                        ]}
                        keyExtractor={a=>a}
                        renderItem={({item})=>{
                            const i=current.findIndex(a=>a==item)
                            const selected=i!==-1
                            return (
                                <Pressable 
                                    style={[{
                                        width:"100%",
                                        backgroundColor:selected ? "#b3c9c9" : "transparent",
                                        justifyContent:"center",
                                        alignItems:"center",
                                    },itemStyle]}
                                    onPress={e=>{
                                        const changed=(a=>{
                                            if(selected){
                                                a.splice(i,1)
                                            }else{
                                                a.push(item)
                                            }
                                            return a
                                        })([...current]);
                                        onChange?.(changed.join(","))
                                    }}
                                    >
                                    <Text numberOfLines={1} style={[{color:"black"},{color,fontSize}]}>{item}</Text>
                                </Pressable>
                            )
                        }}
                        />
                )}
            </View>
        );
    }
    return InputSelector
})();