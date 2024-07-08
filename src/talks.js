import React from "react"
import { View, TextInput, Switch} from 'react-native';
import { ColorScheme, TitleStyle } from "react-native-use-qili/components/default-style";
import FlatList from "react-native-use-qili/components/FlatList";
import { TalkThumb } from "./components";
import PressableIcon from "react-native-use-qili/components/PressableIcon";
import { TalkApi } from "./store"
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-native";
import { defaultMemoize } from "reselect";
import Select from "react-native-select-dropdown";
import SwitchTed from "./components/SwitchTed"

export default function Talks(props){
    const color=React.useContext(ColorScheme)
    const dispatch=useDispatch()
    const isAdmin=useSelector(state=>state.my.isAdmin)
    const searchTextStyle=React.useMemo(()=>({fontSize:20,height:50,color:color.text, paddingLeft:10, position:"absolute", width:"100%", marginLeft:45 ,paddingRight:45,}),[])
    const thumbStyle=React.useMemo(()=>({backgroundColor:color.backgroundColor,borderColor:color.unactive}),[])
    
    const [search, setSearch]=React.useReducer(defaultMemoize(
        (last, next)=>({...last, ...next}),
        shallowEqual,
    ),{ q:"",people:false, peopleName:"", ...useSelector(state=>state.history.search), page:1})
    const pages=10
    
    saveSearchWhenUnmount(search);
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
                    extraData={`${search.q}-${search.page}`}
                    renderItem={props=><TalkThumb {...{
                        ...props,
                        style:thumbStyle,imageStyle,
                        durationStyle,titleStyle, 
                        opacity: props.item.isLocal ? 1 : undefined,
                        onLongPress:e=>dispatch({type:"talk/clear", id:props.item.id}),
                    }}/>}
                    keyExtractor={(item,i)=>`${item.slug}-${i}`}
                    horizontal={true}
                    onEndReachedThreshold={0.5}
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
                    </>
                )}
                {search.people && <PeopleSearch style={searchTextStyle}
                        value={search.q}
                        name={search.peopleName}
                        onValueChange={(q, peopleName)=>setSearch({ q,peopleName, page:1})}/>}
                {isAdmin && <SwitchTed 
                    style={{position:"absolute", right:5, top:10, transform:[{scale:0.5}]}}
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

function saveSearchWhenUnmount(search) {
    const dispatch=useDispatch()
    const $search = React.useRef();
    $search.current = search;
    React.useEffect(() => () => {
        dispatch({ type: "history", search: $search.current });
    }, []);
}

function useInitialScrollIndex(talks) {
    const { state: history } = useLocation();
    const initialScrollIndex = React.useMemo(() => {
        if (!!history?.id && talks.length > 2) {
            const i = talks.findIndex(a => a.id == history.id);
            if (i != -1)
                return i;
        }
    }, [talks, history?.id]);
    return initialScrollIndex;
}

function Search({search}){
    if(!search.q)
        return <SearchToday {...arguments[0]}/>

    if(search.people)
        return <SearchPeople {...arguments[0]}/>

    return <SearchPages {...arguments[0]}/>
}

function SearchToday({search, children}){
    const {data:{talks=[]}={}, isLoading}=useQuery(()=>TalkApi.useTodayQuery({day:new Date().asDateString()}))
    const initialScrollIndex = useInitialScrollIndex(talks);
    const extraData=`${search.q}-${search.page}-${initialScrollIndex}-${talks.length}`
    return React.cloneElement(children,{data: !isLoading && talks, initialScrollIndex,extraData})
}

function SearchPeople({search, children}){
    const trigger=useSelector(state=>state.my.api)//a trigger
    const reg=React.useMemo(()=>search.peopleName && new RegExp(search.peopleName,"i"),[search.peopleName])
    const localMatch=React.useCallback(talk=>!!reg?.test?.(talk.author),[reg])
    const {data:{talks=[]}={}, isLoading}=useQuery(()=>TalkApi.useSpeakerTalksQuery(search),localMatch)
    const initialScrollIndex = useInitialScrollIndex(talks);
    const extraData=`${search.q}-${search.page}-${initialScrollIndex}-${trigger}`
    return React.cloneElement(children,{data: !isLoading && talks, initialScrollIndex,extraData})
}

function SearchPages({search, children}){
    const trigger=useSelector(state=>state.my.api)//a trigger
    const reg=React.useMemo(()=>search.q && new RegExp(search.q,"i"),[search.q])
    const localMatch=React.useCallback(talk=>!!reg?.test?.(talk.title),[reg])
    const {data:{talks=[]}={}, isLoading}=useQuery(()=>TalkApi.useTalksQuery({search}),localMatch)
    const initialScrollIndex = useInitialScrollIndex(talks);
    const extraData=`${search.q}-${search.page}-${initialScrollIndex}-${trigger}`
    return React.cloneElement(children,{data: !isLoading && talks, initialScrollIndex,extraData})
}

function useQuery(query, localMatch){
    const localTalks=useSelector(state => {
        const widgets = ['vocabulary', 'picturebook', 'dialog', 'chat', 'audiobook'];
        return Object.values(state.talks).map(talk => {
            if(widgets.indexOf(talk.slug) == -1){
                const {id,title,slug,author,thumb,duration}=talk
                return {id,title,slug,author,thumb,duration,isLocal:true}
            }
        }).filter(a=>!!a)
    })

    const filteredLocalTalks=React.useMemo(()=>localMatch ? localTalks.filter(localMatch) : localTalks,[localMatch, localTalks])

    const merge=React.useCallback(defaultMemoize((localTalks, talks)=>{
        return [...localTalks, ...(talks||[]).filter(a=>!localTalks.find(b=>b.id==a.id))]
    }),[])

    const result = query()
    const {data, isLoading}=result
    return {
        ...result, 
        data:{
            talks:merge(filteredLocalTalks, data?.talks)
        }, 
        isLoading: isLoading && filteredLocalTalks.length==0
    }
}

const imageStyle={height:180}
const durationStyle={bottom:40,top:undefined}
const titleStyle={height:40}