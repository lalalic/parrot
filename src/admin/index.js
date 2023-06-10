import React from "react"
import { View, Text, SectionList} from "react-native"
import { useDispatch } from "react-redux"
import { PressableIcon, Loading } from "../components"
import { Qili } from "../store"

export default function Admin(){
    const dispatch=useDispatch()
    const {data:{talks=[]}={}, isLoading}=Qili.useTalksQuery({})
    const {data:{talks:widgetTalks=[]}={}}=Qili.useWidgetTalksQuery({})
    const remove=React.useCallback(async talk=>{
        await Qili.fetch({
            id:"remove",
            variables:{
                id:talk.id,
                type:"Talk",
            }
        })
        dispatch(Qili.util.resetApiState())
    },[])

    const data=React.useMemo(()=>([
        {title:"Talks", data:talks}, 
        ...(talks=>Object.keys(talks).map(title=>({title, data:talks[title]})))(widgetTalks.reduce((slugs, a)=>{
            const slugTalks=slugs[a.slug]||(slugs[a.slug]=[])
            slugTalks.push(a)
            return slugs
        },{})),
    ]),[talks, widgetTalks])

    if(isLoading)
        return <Loading/>
    
    const headerStyle={fontSize:32, textAlign:"center"}
    return (
        <SectionList sections={data}
            style={{flex:1, marginTop:20, height:"100%"}}
            renderSectionHeader={({section})=>(<Text style={headerStyle}>{section.title}</Text>)}
            renderItem={({item})=>(
                <View style={{marginBottom:10, marginTop:10, flex:1, flexDirection:"row", alignItems:"center"}}>
                    <PressableIcon name="delete-outline" onPress={e=>remove(item)}/>
                    <Text style={{paddingLeft:5, color:item.languages?.mine ? "white" : "red"}}>{item.title}</Text>
                </View>
            )}
            keyExtractor={(item)=>item.id}
            />
    )
}

