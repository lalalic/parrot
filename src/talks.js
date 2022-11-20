import React from "react"
import { FlatList, View, TextInput} from 'react-native';
import { ColorScheme, TitleStyle } from "./default-style";
import { PressableIcon, TalkThumb } from "./components";
import { Ted } from "./store"
import { Picker } from "@react-native-picker/picker"
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-native";

export default function Talks(props){
    const dispatch=useDispatch()
    const {state: history}=useLocation()
    const color=React.useContext(ColorScheme)
    const thumbStyle={backgroundColor:color.backgroundColor,borderColor:color.unactive}
    
    const [search, setSearch]=React.useReducer((last, next)=>{
        return {...last, ...next}
    },useSelector(state=>{
        const {search}=state.history
        if(search){
            return {q:search.q, page:1, people:search.people}
        }
    })||{q:"",page:1, people:false})
    
    const {data:{talks=[],pages=1}={}}=useTalksQuery(search)

    const initialScrollIndex=React.useMemo(()=>{
        if(!!history?.id && talks.length>2){
            return talks.findIndex(a=>a.id==history.id)
        }
    },[talks, history?.id])

    const searchTextStyle={fontSize:20,height:50,color:color.text, paddingLeft:10, position:"absolute", width:"100%", marginLeft:45 ,paddingRight:45,}
    return (
        <View {...props}>
            <View style={[{flexDirection:"row",height:32,paddingLeft:10, 
                backgroundColor:color.inactive, borderRadius:5,borderWidth:1,height:50,
                marginLeft:4,marginRight:2},TitleStyle]}>
                <PressableIcon name={search.people ? "person-search" : "search"} 
                    size={28} style={{marginTop:2}}
                    color={search.people ? color.primary : color.text} 
                    onPress={e=>setSearch({ people: !search.people,q:""})}
                    />
            </View>
            <FlatList
                data={talks}
                extraData={`${search.q}-${search.page}-${initialScrollIndex}-${talks.length}`}
                renderItem={props=><TalkThumb {...props} {...{style:thumbStyle,imageStyle,durationStyle,titleStyle}}/>}
                keyExtractor={(item,i)=>`${item.slug}-${i}`}
                horizontal={true}
                onEndReachedThreshold={0.5}
                initialScrollIndex={initialScrollIndex}
                getItemLayout={(data,index)=>({length:240, offset:240*index, index})}
                onEndReached={e=>{
                    if(search.page<pages){
                        setSearch({ page:search.page+1})
                    }
                }}
                />
                {!search.people && <TextInput placeholder="TED Talk" defaultValue={search.q} 
                        clearButtonMode="while-editing"
                        keyboardType="web-search"
                        onEndEditing={({nativeEvent:{text:q}})=>{
                            setSearch({ q, page:1})
                        }}
                        style={searchTextStyle}/>}
                {search.people && <PeopleSearch style={searchTextStyle}
                        selectedValue={search.q} 
                        onValueChange={(q)=>setSearch({ q, page:1})}/>}
        </View>
    )
}

const PeopleSearch=({style, onValueChange, ...props})=>{
    const color=React.useContext(ColorScheme)
    const [search, setSearch]=React.useState({q:"", showPicker:false})
    const {data:people=[]}=Ted.usePeopleQuery({q:search.q.trim()})
    return (
        <>
            <TextInput style={style} placeholder="TED Speaker"
                value={search.q}
                onChangeText={q=>setSearch({q,showPicker:true})}/>
            {search.showPicker && people.length>0 && <Picker {...props} mode="dropdown" 
                itemStyle={{color:color.primary}}
                onValueChange={value=>{
                    setSearch({q:people.find(a=>a.slug==value).name, showPicker:false})
                    onValueChange?.(value)
                }}
                style={{position:"absolute",width:"100%",
                    backgroundColor:color.inactive,top:35, 
                    height:200}} >
                {people.map(a=><Picker.Item {...{key:a.slug, label:a.name, value:a.slug}}/>)}
            </Picker>}
        </>
    )
}

export function useTalksQuery(search){
    const dispatch=useDispatch()

    React.useEffect(()=>{
        try{
            if(!search.q){
                const sub=dispatch(Ted.endpoints.today.initiate())
                return ()=>sub.unsubscribe()
            }

            if(search.people){
                const sub=dispatch(Ted.endpoints.speakerTalks.initiate(search))
                return ()=>sub.unsubscribe()
            }

            const subs=new Array(search.page).fill(0).map((a,i)=>dispatch(Ted.endpoints.talks.initiate({...search,page:i+1})))
            return ()=>subs.forEach(a=>a.unsubscribe())
        }finally{
            dispatch({type:"history", search})
        }
    },[search])

    return useSelector(state=>{
        if(!search.q){
            return Ted.endpoints.today.select()(state)
        }
    
        if(search.people){
            return Ted.endpoints.speakerTalks.select(search)(state)
        }

        const selects=new Array(search.page).fill(0).map((a,i)=>{
            return Ted.endpoints.talks.select({...search,page:i+1})(state)
        })
        const unfinished=selects.find(a=>a.status!=="fulfilled")
        if(unfinished)
            return {}
        
        return selects.reduce(((talks,a,i,arr)=>{
            talks.push(a.data.talks)
            if(i==arr.length-1){
                return {...a, data:{...a.data, talks:talks.flat()}}
            }
            return talks
        }),[])
    })
}

const imageStyle={height:180}
const durationStyle={bottom:40,top:undefined}
const titleStyle={height:40}