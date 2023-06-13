import React, { useMemo } from "react"
import { FlatList, Pressable, TextInput, View, Text, } from "react-native"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useParams } from "react-router-native"
import Select from "react-native-select-dropdown"
import { PressableIcon, KeyboardAvoidingView } from "../components"
import { ColorScheme } from "../components/default-style"
import { selectWidgetTalks } from "../store"

export default Wrapper=({})=>{
    const {slug, id}=useParams()
    if(Widgets[slug]?.TaggedTranscript){
        const MyTaggedTranscript=Widgets[slug].TaggedTranscript
        return <MyTaggedTranscript slug={slug} id={id}/>
    }
    return <TaggedTranscript slug={slug} id={id}/>
}


/**
 * it's for audio item {text, uri}
 */
export function TaggedTranscript({slug, id:$id, actions, listProps={}, renderItem}){
        const color=React.useContext(ColorScheme)
        const navigate=useNavigate()
        
        const talks=useSelector(state=>selectWidgetTalks(state, slug))
        const [state, setState]=React.useState(()=>{
            const {title,id}=talks[talks.findIndex(a=>a.id==$id)]||talks[0]||{}
            return ({current:title,id})
        })
        
        const tags=React.useMemo(()=>talks.map(a=>a.title),[talks])
        const {data=[]}=React.useMemo(()=>talks.find(a=>a.title==state.current)||{},[talks, state.current])

        const inputStyle={flex:1, fontSize:20,height:"100%",color:color.text, backgroundColor:color.inactive,paddingLeft:10,marginLeft:10}
        const {renderItem:WidgetItem=renderItem}=listProps

        return (
            <KeyboardAvoidingView style={{flex:1,marginTop:20}} behavior="padding">
                <Text style={{textAlign:"center", height:20}}>{slug.toUpperCase()}</Text>
                <View style={{flexDirection:"row"}}>
                    <TextInput style={inputStyle} onChangeText={q=>setState({...state,q})}/>
                    <Select style={{flex:1}} data={tags} defaultValueByIndex={tags.indexOf(state.current)}
                        onSelect={value=>{
                            const talk=talks.find(a=>a.title==value)
                            setState({...state,listing:false, current:talk.title, id: talk.id})
                        }}
                        />
                </View>
                <View style={{flexGrow:1,flex:1}}>
                    <FlatList data={data.filter(a=>!state.q || a.text.indexOf(state.q)!=-1)} 
                        extraData={`${state.q}-${state.current}-${data.length}`}
                        keyExtractor={a=>`${a.uri}-${a.text}`}
                        {...listProps}
                        renderItem={props=><WidgetItem {...{...props,id:state.id, slug}}/>}
                        />
                </View>
                {!!state.id && <View style={{height:50, flexDirection:"row", justifyContent:"space-around"}}>
                    {actions?.(state.current, state.id)}
                    <PressableIcon name="read-more"
                        onPress={e=>navigate(`/talk/${slug}/shadowing/${state.id}`)}/>
                </View>}
            </KeyboardAvoidingView>
        )
    }