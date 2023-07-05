import React, { useMemo } from "react"
import { FlatList, Pressable, TextInput, View, Text, } from "react-native"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useParams } from "react-router-native"
import Select from "react-native-select-dropdown"
import { KeyboardAvoidingView } from "../components"
import PressableIcon from "use-qili/components/PressableIcon"
import { ColorScheme } from "use-qili/components/default-style"
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
export function TaggedTranscript({slug, id, actions, listProps={}, renderItem, children}){
        const color=React.useContext(ColorScheme)
        const navigate=useNavigate()
        const [q, setSearch]=React.useState("")
        const {data=[], title}=useSelector(state=>state.talks[id])
        const showingData=React.useMemo(()=>data.filter(a=>!q || a.text.indexOf(q)!=-1),[data, q])

        const inputStyle={height:50, fontSize:20,color:color.text, backgroundColor:color.inactive,paddingLeft:10}
        const {renderItem:WidgetItem=renderItem}=listProps

        return (
            <KeyboardAvoidingView style={{flex:1,marginTop:20}} behavior="padding">
                <TextInput style={inputStyle} onChangeText={search=>setSearch(search)}/>
                <View style={{flexGrow:1,flex:1}}>
                    {children ? React.cloneElement(children, {id, filter:q}) : <FlatList data={showingData} 
                        extraData={`${q}-${title}-${data.length}`}
                        keyExtractor={a=>`${a.uri}-${a.text}`}
                        {...listProps}
                        renderItem={props=><WidgetItem {...{...props,id, slug}}/>}
                        />}
                </View>
                {!!id && <View style={{height:50, flexDirection:"row", justifyContent:"space-around"}}>
                    {actions?.(title, id)}
                    <PressableIcon name="read-more"
                        onPress={e=>navigate(`/talk/${slug}/shadowing/${id}`)}/>
                </View>}
            </KeyboardAvoidingView>
        )
    }