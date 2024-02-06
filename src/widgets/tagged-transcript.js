import React from "react"
import { FlatList, TextInput, View, } from "react-native"
import { useSelector } from "react-redux"
import { useNavigate, useParams } from "react-router-native"
import * as Clipboard from 'expo-clipboard';

import { KeyboardAvoidingView, } from "../components"
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
export function TaggedTranscript({slug, id, actions, listProps={}, renderItem, children, editor}){
    const color=React.useContext(ColorScheme)
    const navigate=useNavigate()
    const [q, setSearch]=React.useState("")
    const {data=[], title}=useSelector(state=>state.talks[id])
    const showingData=React.useMemo(()=>data.filter(a=>!q || a.text.indexOf(q)!=-1),[data, q])

    const inputStyle={height:50, fontSize:16,color:color.backgroundColor, backgroundColor:color.text,paddingLeft:10, borderRadius:5, marginBottom:2}
    const {renderItem:WidgetItem=renderItem}=listProps
    const [active, setActive]=React.useState(-1)
    const $setActive=React.useCallback(i=>setActive(i),[setActive])
    
    return (
        <KeyboardAvoidingView style={{flex:1,marginTop:10}} behavior="padding">
            <TextInput style={inputStyle} placeholder={l10n["Filter"]} onChangeText={search=>setSearch(search)}/>
            <View style={{flexGrow:1,flex:1}}>
                {children ? React.cloneElement(children, {id, filter:q}) : <FlatList data={showingData} 
                    extraData={`${q}-${title}-${data.length}`}
                    keyExtractor={(a,i)=>`${a.uri}-${a.text}${i==active ? '-active':''}`}
                    {...listProps}
                    renderItem={props=><WidgetItem {...{...props,id, slug, isActive:active==props.index, setActive:$setActive}}/>}
                    />}
            </View>
            {editor && React.cloneElement(
                React.isValidElement(editor) ? editor : <Editor {...{style:inputStyle, ...editor}}/>, 
                {
                    index:active, 
                    data: showingData[active]
                }
            )}
            {!!id && <View style={{height:50, flexDirection:"row", justifyContent:"space-around"}}>
                {actions}
                {data.length>0 && <PressableIcon name="read-more"
                    onPress={e=>navigate(`/talk/${slug}/shadowing/${id}`)}/>}
            </View>}
        </KeyboardAvoidingView>
    )
}

function Editor({onAdd, style, onChange, index, data, getItemText, editingStyle=style, ...props}){
    const [value, setValue]=React.useState("")
    React.useEffect(()=>{
        if(index>-1 && data && getItemText){
            const text=getItemText(data)
            setValue(text)
            Clipboard.setStringAsync(text)
        }
        if(index==-1){
            setValue("")
        }
    },[index, data, getItemText])
    const submit=React.useCallback(function({value, index, data}){
        if(index>-1){
            onChange?.(value, index, data)
        }else if(onAdd){
            onAdd(value)
        }
        setValue("")
    })
    if(!onAdd && index==-1)
        return null
    return (
        <View style={[{flexDirection:"row", borderRadius:5, justifyContent:"center", alignItems:"center", backgroundColor:"white"}]}>
            <TextInput 
                style={[{flex:1,paddingLeft:5},index>-1 ? editingStyle : style]} 
                placeholder={l10n["Append Item"]}
                returnKeyType="done"
                onSubmitEditing={e=>submit({value, index, data})}
                {...props}
                value={value} 
                onChangeText={text=>setValue(text)}
                />
            <PressableIcon 
                name={index>-1 ? "blur-circular" : (onAdd ? "add-circle-outline" : "")}
                onPress={e=>submit({value, index, data})}/>
        </View>
    )
}


export function clean(ob){
    const keys=Object.keys(ob)
    Object.values(ob).forEach((value, i)=>{
        if(value===undefined){
            delete ob[keys[i]]
        }
    })
    return ob
}

export function getItemText({text, pronunciation, translated, classification, explanation},showAll=true, sep=" "){
    if(!showAll)
        return text
    pronunciation=pronunciation ? `[${pronunciation}]` : ""
    translated= translated? `(${translated})` : ""
    classification= classification ? `${classification}. ` : ""
    let extra = [classification,explanation||""].filter(a=>!!a).join("")
    extra = extra ? `${sep}- ${extra}` : ""
    return `${text}${sep}${pronunciation}${sep}${translated}${extra}`
}