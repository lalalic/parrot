import React from "react"
import { View, TextInput, Switch} from 'react-native';
import { ColorScheme, TitleStyle } from "react-native-use-qili/components/default-style";
import FlatList from "react-native-use-qili/components/FlatList";
import { TalkThumb } from "./components";
import PressableIcon from "react-native-use-qili/components/PressableIcon";
import { TalkApi, getTalkApiState } from "./store"
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-native";
import { defaultMemoize } from "reselect";
import Select from "react-native-select-dropdown";
import SwitchTed from "./components/SwitchTed"

export default function Talks(props){
    const {state: history}=useLocation()
    const color=React.useContext(ColorScheme)
    const isAdmin=useSelector(state=>state.my.isAdmin)

    const thumbStyle={backgroundColor:color.backgroundColor,borderColor:color.unactive}
    
    const [search, setSearch]=React.useReducer(defaultMemoize(
        (last, next)=>({...last, ...next}),
        shallowEqual,
    ),{ q:"",people:false, peopleName:"",local:false, ...useSelector(state=>state.history.search), page:1})
    
    const {data:{talks=[],pages=1}={}, isLoading}=useTalksQuery(search)

    const initialScrollIndex=React.useMemo(()=>{
        if(!!history?.id && talks.length>2){
            const i= talks.findIndex(a=>a.id==history.id)
            if(i!=-1)
                return i
        }
    },[talks, history?.id])

    const searchTextStyle={fontSize:20,height:50,color:color.text, paddingLeft:10, position:"absolute", width:"100%", marginLeft:45 ,paddingRight:45,}
    return (
        <View {...props}>
            <View style={[{flexDirection:"row",height:32,paddingLeft:10, 
                backgroundColor:color.inactive, borderRadius:5,borderWidth:1,height:50,
                marginLeft:4,marginRight:2},TitleStyle]}>
                <PressableIcon 
                    name={search.people ? "person-search" : "search"} 
                    label={l10n[search.people ? "People" : "Talk"]} labelFade={true}
                    size={28} style={{marginTop:2}}
                    color={search.people ? color.primary : color.text} 
                    onPress={e=>setSearch({ people: !search.people,q:""})}
                    />
            </View>
            <Search search={search}>
                <FlatList
                    extraData={`${search.q}-${search.page}-${initialScrollIndex}-${talks.length}`}
                    renderItem={props=><TalkThumb {...props} {...{style:thumbStyle,imageStyle,durationStyle,titleStyle}}/>}
                    keyExtractor={(item,i)=>`${item.slug}-${i}`}
                    horizontal={true}
                    onEndReachedThreshold={0.5}
                    initialScrollIndex={initialScrollIndex}
                    getItemLayout={(data,index)=>({length:240, offset:240*index, index})}
                    onEndReached={e=>{
                        if(search.page<pages){
                            setSearch({ page:(search.page??1)+1})
                        }
                    }}
                    />
            </Search>
                {!search.people && (
                    <>
                        <TextInput 
                            placeholder="Search Talks" 
                            defaultValue={search.q} 
                            clearButtonMode="while-editing"
                            keyboardType="web-search"
                            onEndEditing={({nativeEvent:{text:q}})=>{
                                setSearch({ q, page:1, peopleName:""})
                            }}
                            style={searchTextStyle}/>
                        
                        {isAdmin && <Switch value={!!search.local}
                            style={{position:"absolute", right:5, top:10, transform:[{scale:0.5}]}}
                            onValueChange={e=>setSearch({local:!search.local})}
                            />}
                    </>
                )}
                {search.people && <PeopleSearch style={searchTextStyle}
                        value={search.q}
                        name={search.peopleName}
                        onValueChange={(q, peopleName)=>setSearch({ q,peopleName, page:1})}/>}
                {isAdmin && <SwitchTed 
                    style={{position:"absolute", right:35, top:10, transform:[{scale:0.3}]}}
                    />}
        </View>
    )
}

const PeopleSearch=({style, onValueChange, value, name, ...props})=>{
    const [search, setSearch]=React.useState({q:value, name})
    const {data:people=[]}=TalkApi.usePeopleQuery({q:search.q.trim()})
    return (
            <View style={[style]}>
                <Select {...props}
                    dropdownStyle={{marginRight:5}}
                    defaultButtonText="Search Speaker Talks"
                    buttonStyle={{
                        backgroundColor:"transparent",
                        justifyContent:"flex-start",
                        flex:1, height:"100%", width:"100%"}}
                    search={true}
                    defaultValue={search.name}
                    onChangeSearchInputText={q=>setSearch({q})}
                    data={people.map(({name})=>name)}
                    onSelect={(value,i)=>{
                        setSearch({name:people[i].name, q: value})
                        onValueChange?.(value, people[i].name)
                    }}
                />
            </View>
    )
}

function Search({search}){
    if(search.local)
        return <SearchLocal {...arguments[0]}/>
    
    if(!search.q)
        return <SearchToday {...arguments[0]}/>

    if(search.people)
        return <SearchPeople {...arguments[0]}/>

    return <SearchPages {...arguments[0]}/>
}

function SearchLocal({children}){
    const talks=useSelector(state=>{
        const widgets=['vocabulary','picturebook','dialog','chat','audiobook']
		return Object.values(state.talks).filter(talk=>{
			return widgets.indexOf(talk.slug)==-1
		})
    })
    return React.cloneElement(children,{data:talks})
}

function SearchToday({children}){
    const {data:{talks=[]}={}, isLoading}=TalkApi.useTodayQuery({day:new Date().asDateString()})
    return React.cloneElement(children,{data: !isLoading && talks})
}

function SearchPeople({search, children}){
    const {data:{talks}={}, isLoading}=TalkApi.useSpeakerTalksQuery(search)
    return React.cloneElement(children,{data: !isLoading && talks})
}

function SearchPages({search, children}){
    const [talks, setTalks]=React.useState([])
    const [loaded, setLoaded]=React.useState(0)
    
    React.useEffect(()=>{
        setTalks([])
        setLoaded(0)
    },[search])

    const addTalks=React.useCallback(data=>{
        if(data){
            setLoaded(loaded+1)
            if(data.length>0){
                setTalks([...talks, ...data])
            }
        }
    },[talks, loaded])
    const isLoading=!(talks.length>0 || loaded==search.page)
    return (
        <>
            {new Array(search.page).fill(0).map((a,i)=>
                <Page key={i} addTalks={addTalks} search={{...search, page:i+1}}/>)}
            {React.cloneElement(children,{data: !isLoading && talks})}
        </>
    )
}

function Page({search, addTalks}){
    const {data:{talks=[]}={}, isLoading}=TalkApi.useTalksQuery(search)
    React.useEffect(()=>{
        addTalks(!isLoading && talks)
    },[talks])
    return null
}

const VOID=state=>({})
export function useTalksQuery(search){
    const dispatch=useDispatch()
    const select=React.useRef(VOID)
    const api=useSelector(state=>state.my.api)
    React.useEffect(()=>{
        try{
            if(search.local){
                return 
            }

            if(!search.q){
                const sub=dispatch(TalkApi.endpoints.today.initiate({day:new Date().asDateString()}))
                return ()=>sub.unsubscribe()
            }

            if(search.people){
                const sub=dispatch(TalkApi.endpoints.speakerTalks.initiate(search))
                return ()=>sub.unsubscribe()
            }

            const subs=new Array(search.page).fill(0).map((a,i)=>dispatch(TalkApi.endpoints.talks.initiate({...search,page:i+1})))
            return ()=>subs.forEach(a=>a.unsubscribe())
        }finally{
            select.current=defaultMemoize(
                state=>{   
                    if(search.local){
                        const widgets=['vocabulary','picturebook','dialog','chat','audiobook']
                        const videoTalks=Object.values(state.talks).filter(talk=>{
                            return widgets.indexOf(talk.slug)==-1
                        })
                        return {data: {talks:videoTalks}, isLoading:false}
                    } 

                    if(!search.q){
                        return TalkApi.endpoints.today.select({day:new Date().asDateString()})(state)
                    }
                
                    if(search.people){
                        return TalkApi.endpoints.speakerTalks.select(search)(state)
                    }
            
                    const selects=new Array(search.page).fill(0).map((a,i)=>{
                        return TalkApi.endpoints.talks.select({...search,page:i+1})(state)
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
                },
                (a,b)=>getTalkApiState(a).queries==getTalkApiState(b).queries && a.talks==b.talks
            )

            dispatch({type:"history", search})
        }
    },[search, api])

    const selector=React.useCallback(select.current,[search, select.current])
    return useSelector(selector)
}

const imageStyle={height:180}
const durationStyle={bottom:40,top:undefined}
const titleStyle={height:40}