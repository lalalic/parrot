import React, { useMemo } from "react"
import { FlatList, Pressable, TextInput, View, Text} from "react-native"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useParams } from "react-router-native"
import Select from "react-native-select-dropdown"
import { PressableIcon, PlaySound } from "../components"
import { ColorScheme } from "../components/default-style"
import { selectBook } from "../store"

export default Wrapper=({slug=useParams().slug})=>{
    if(Widgets[slug]?.TaggedTranscript){
        const MyTaggedTranscript=Widgets[slug].TaggedTranscript
        return <MyTaggedTranscript slug={slug}/>
    }
    return <TaggedTranscript slug={slug}/>
}


/**
 * it's for audio item {text, uri}
 */
export function TaggedTranscript({slug, actions, listProps={}, renderItem}){
        const color=React.useContext(ColorScheme)
        const navigate=useNavigate()
        const [state, setState]=React.useState({})
        const tagTalks=useSelector(state=>Object.values(state.talks).filter(a=>a.slug==slug && a.id!=slug))
        if(tagTalks.length>0 && !state.tag){
            setState({...state, tag:tagTalks[0].tag})
        }
        const tags=React.useMemo(()=>tagTalks.map(a=>a.tag),[tagTalks])

        const talks=useSelector(state=>state[slug])
        const data=useMemo(()=>selectBook({[slug]:talks},slug, state.tag),[state.tag, talks])
        const inputStyle={flex:1, fontSize:20,height:"100%",color:color.text, backgroundColor:color.inactive,paddingLeft:10,marginLeft:10}
        const {renderItem:WidgetItem=renderItem}=listProps

        return (
            <View style={{flex:1,marginTop:20}}>
                <Text style={{textAlign:"center", height:20}}>{slug.toUpperCase()}</Text>
                <View style={{flexDirection:"row"}}>
                    <TextInput style={inputStyle} onChangeText={q=>setState({...state,q})}/>
                    <Select style={{flex:1}} data={tags}
                        defaultValueByIndex={tags.indexOf(state.tag)}
                        onSelect={value=>{
                            const talk=tagTalks.find(a=>a.tag==value)
                            setState({...state,listing:false, tag:talk.tag, id: talk.id})
                        }}
                        />
                </View>
                <View style={{flexGrow:1,flex:1}}>
                    <FlatList data={data.filter(a=>!state.q || a.text.indexOf(state.q)!=-1)} 
                        extraData={`${state.q}-${state.tag}-${data.length}`}
                        keyExtractor={a=>`${a.uri}-${a.text}`}
                        {...listProps}
                        renderItem={props=><WidgetItem {...{...props,tag:state.tag, slug}}/>}
                        />
                </View>
                <View style={{height:50, flexDirection:"row", justifyContent:"space-around"}}>
                    {actions(state.tag)}
                    <PressableIcon name="read-more"
                        onPress={e=>navigate(`/talk/${slug}/shadowing/${state.id}`)}/>
                </View>
            </View>
        )
    }

