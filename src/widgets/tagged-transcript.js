import React, { useMemo } from "react"
import { FlatList, Pressable, TextInput, View, Text, } from "react-native"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useParams } from "react-router-native"
import { KeyboardAvoidingView, useTalkQuery } from "../components"
import PressableIcon from "react-native-use-qili/components/PressableIcon"
import { ColorScheme } from "react-native-use-qili/components/default-style"
const l10n=globalThis.l10n

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

        const inputStyle={height:50, fontSize:16,color:color.backgroundColor, backgroundColor:color.text,paddingLeft:10, borderRadius:5}
        const {renderItem:WidgetItem=renderItem}=listProps

        return (
            <KeyboardAvoidingView style={{flex:1,marginTop:10}} behavior="padding">
                <TextInput style={inputStyle} placeholder={l10n["Filter"]} onChangeText={search=>setSearch(search)}/>
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