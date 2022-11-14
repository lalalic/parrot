import React from "react"
import { FlatList, Pressable, TextInput, View, Text} from "react-native"
import { useDispatch, useSelector } from "react-redux"
import { useParams } from "react-router-native"
import { PressableIcon } from "./components"
import { ColorScheme } from "./default-style"

export default function TagMan({slug=useParams().slug, actions, listProps}){
    const color=React.useContext(ColorScheme)
    const dispatch=useDispatch()
    const [state, setState]=React.useReducer((state,action)=>({...state,...action}),{})
    const tags=useSelector(state=>Object.values(state.talks).filter(a=>a.slug==slug && a.id!=slug))
    const data=useSelector(state=>state[slug])
    const inputStyle={fontSize:20,height:30,color:color.text, backgroundColor:color.inactive,paddingLeft:10,marginLeft:10,marginRight:10}
    
    return (
        <View style={{flex:1,marginTop:20}}>
            <Text style={{textAlign:"center", height:20}}>{slug.toUpperCase()}</Text>
            <TextInput style={inputStyle} onChangeText={q=>setState({q})}/>
            <View style={{flexGrow:1}}>
                <FlatList data={data.filter(a=>!state.q || a.text.indexOf(state.q)!=-1)} 
                    extraData={`${state.q}-${state.tag}-${data.length}`}
                    keyExtractor={a=>a.uri}
                    renderItem={({item})=>(
                        <Pressable 
                            onLongPress={e=>dispatch({type:`${slug}/remove`, uri:item.uri})}
                            style={{flexDirection:"row", height:50}}>
                            <PressableIcon name={item.tags?.includes(state.tag) ? "check-circle-outline" : "radio-button-unchecked"} 
                                onPress={e=>dispatch({type:`${slug}/tag`, uri:item.uri, tag:state.tag})}/>
                            <View style={{justifyContent:"center",marginLeft:10}}>
                                <Text>{item.text}</Text>
                            </View>
                        </Pressable>
                    )}
                    {...listProps}
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
                    renderItem={({item})=>(
                        <Pressable style={{height:40, justifyContent:"center"}}
                            onPress={e=>setState({listing:false, tag:item.tag})}>
                            <Text style={{fontSize:16}}>{item.tag}</Text>
                        </Pressable>
                    )}/>}
            </View>
        </View>
    )
}

export function PictureBookMan({}){
    const color=React.useContext(ColorScheme)
    const thumbStyle={}
    return (
        <TagMan 
            slug="picturebook"
            actions={<PressableIcon name="add-a-photo" />}
            listProps={{
                numColumns:2,
                renderItem:item=>(
                    <Pressable style={{flex:1,flexDirection:"row", justifyContent:"center"}}
                        onLongPress={e=>dispatch({type:`${slug}/remove`, uri:item.uri})}
                        >
                        <Image src={item.uri} style={thumbStyle}/>
                        <Text>{item.text}</Text>
                        <PressableIcon name={item.tags?.includes(state.tag) ? "check-circle-outline" : "radio-button-unchecked"} 
                                onPress={e=>dispatch({type:`${slug}/tag`, uri:item.uri, tag:state.tag})}/>
                    </Pressable>
                ),
            }}
        />
    )
}

