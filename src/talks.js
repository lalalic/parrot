import React from "react"
import { FlatList, View, TextInput} from 'react-native';
import { ColorScheme } from "./default-style";
import { PressableIcon, TalkThumb } from "./components";
import { Ted } from "./store"
import { Picker } from "@react-native-picker/picker"

export default function Talks(){
    const color=React.useContext(ColorScheme)
    const thumbStyle={backgroundColor:color.backgroundColor,borderColor:color.unactive}
    const imageStyle={height:180}
    const durationStyle={bottom:40,top:undefined}
    const titleStyle={height:40}
    
    const talkPageCache=React.useRef([])
    const [search, setSearch]=React.useReducer((last, next)=>{
        if(last.q!=next.q){
            talkPageCache.current=[]
        }
        return next
    },{q:"",page:1, people:false})

    const {data:{talks=[],page=1,pages=1}={}}=(()=>{
        if(search.q){
            if(search.people){
                return Ted.useSpeakerTalksQuery(search)
            }
            return Ted.useTalksQuery(search)
        }
        return Ted.useTodayQuery(new Date().asDateString())
    })();

    if(page===search.page){
        talkPageCache.current[search.page-1]=talks
    }
    const searchTextStyle={fontSize:16,height:28,color:color.text, paddingLeft:10, position:"absolute",top:2, width:"100%", marginLeft:45 ,paddingRight:45,}
    return (
        <View style={{flex:1}}>
            <View style={{flexDirection:"row",height:32,paddingLeft:10,
                backgroundColor:color.inactive, borderRadius:5,
                borderWidth:1,marginLeft:4,marginRight:2}}>
                <PressableIcon name={search.people ? "person-search" : "search"} 
                    size={28} style={{marginTop:2}}
                    color={search.people ? color.primary : color.text} 
                    onPress={e=>setSearch({...search, people: !search.people,q:""})}
                    />
            </View>
            <FlatList
                data={(()=>{
                    if(!search.q || search.page==1 || search.people)
                        return talks
                    return talkPageCache.current.flat()
                })()}
                extraData={`${search.q}-${search.page}`}
                renderItem={props=><TalkThumb {...props} {...{style:thumbStyle,imageStyle,durationStyle,titleStyle}}/>}
                keyExtractor={item=>item.slug}
                horizontal={true}
                onEndReachedThreshold={0.5}
                onEndReached={e=>search.page<pages && setSearch({...search, page:search.page+1})}
                />
                {!search.people && <TextInput placeholder="TED Talks Daily" 
                        clearButtonMode="while-editing"
                        keyboardType="web-search"
                        onEndEditing={({nativeEvent:{text:q}})=>{
                            talkPageCache.current=[]
                            setSearch({...search, q, page:1})
                        }}
                        style={searchTextStyle}/>}
                {search.people && <PeopleSearch style={searchTextStyle}
                        selectedValue={search.q} 
                        onValueChange={(q)=>setSearch({...search, q, page:1})}/>}
        </View>
    )
}

const PeopleSearch=({style, onValueChange, ...props})=>{
    const color=React.useContext(ColorScheme)
    const [search, setSearch]=React.useState({q:"", showPicker:false})
    const {data:people=[]}=Ted.usePeopleQuery({q:search.q.trim()})
    return (
        <>
            <TextInput style={style} 
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