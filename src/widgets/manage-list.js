import React from "react"
import { FlatList, Pressable, TextInput, View, Text} from "react-native"
import { useDispatch, useSelector } from "react-redux"
import { useParams } from "react-router-native"
import { PressableIcon, PlaySound } from "../components"
import { ColorScheme } from "../components/default-style"

export default Wrapper=({slug=useParams().slug})=>{
    if(Widgets[slug]?.ManageList){
        const MyManageList=Widgets[slug].ManageList
        return <MyManageList slug={slug}/>
    }
    return <ManageList slug={slug}/>
}

export function ManageList({slug, actions, listProps={}, audioUri=item=>item.uri}){
    const color=React.useContext(ColorScheme)
    const dispatch=useDispatch()
    const [state, setState]=React.useReducer((state,action)=>({...state,...action}),{})
    const tags=useSelector(state=>Object.values(state.talks).filter(a=>a.slug==slug && a.id!=slug))
    const data=useSelector(state=>state[slug])
    const inputStyle={fontSize:20,height:30,color:color.text, backgroundColor:color.inactive,paddingLeft:10,marginLeft:10,marginRight:10}
    const renderItem=listProps.renderItem || React.useCallback(({item,tag})=>{
        return (
            <Pressable 
                onLongPress={e=>dispatch({type:`${slug}/remove`, uri:item.uri})}
                style={{flexDirection:"row", height:50}}>
                <PressableIcon name={item.tags?.includes(state.tag) ? "check-circle-outline" : "radio-button-unchecked"} 
                    onPress={e=>{
                        if(state.tag){
                            dispatch({type:`${slug}/tag`, uri:item.uri, tag:state.tag})
                        }
                    }}/>
                <View style={{justifyContent:"center",marginLeft:10, flexGrow:1, flex:1}}>
                    <Text>{item.text}</Text>
                </View>
                {!!audioUri?.(item) && (<PlaySound.Trigger style={{flex:1}} audio={audioUri(item)}/>)}
            </Pressable>
        )
    },[state.tag]);
    return (
        <View style={{flex:1,marginTop:20}}>
            <Text style={{textAlign:"center", height:20}}>{slug.toUpperCase()}</Text>
            <TextInput style={inputStyle} onChangeText={q=>setState({q})}/>
            <View style={{flexGrow:1,flex:1}}>
                <FlatList data={data.filter(a=>!state.q || a.text.indexOf(state.q)!=-1)} 
                    extraData={`${state.q}-${state.tag}-${data.length}`}
                    keyExtractor={a=>a.uri}
                    {...listProps}
                    renderItem={props=>renderItem({...props,tag:state.tag})}
                    />
            </View>
            <View style={{height:50, flexDirection:"row", justifyContent:"space-around"}}>
                <PressableIcon name="delete-outline" label=" " disabled={!!state.tag}/>
                {actions}
                <PressableIcon name="edit" label={state.tag}
                    onLongPress={e=>setState({tag:null})}
                    onPress={e=>setState({listing:!state.listing})}/>
                {state.listing && <FlatList data={tags} keyExtractor={a=>a.tag}
                    style={{position:"absolute",right:40,bottom:50, backgroundColor:color.inactive,padding:10}}
                    renderItem={({item,index})=>(
                        <>  
                            <Pressable style={{height:40, justifyContent:"center"}}
                                onPress={e=>setState({listing:false, tag:item.tag})}>
                                <Text style={{fontSize:16}}>{item.tag}</Text>
                            </Pressable>
                        </>
                    )}/>}
            </View>
        </View>
    )
}

