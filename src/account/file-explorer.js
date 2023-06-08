import React from "react"
import {FlatList, Pressable, Text, View} from "react-native"
import * as FileSystem from "expo-file-system"
import { ColorScheme } from "../components/default-style"
import * as Sharing from "expo-sharing"

const Context=React.createContext({})
export default function FileExplorer({dir=[FileSystem.documentDirectory, FileSystem.cacheDirectory], title, ...props}){
    console.info(dir)
    const [current, $setCurrent]=React.useState()
    const setCurrent=React.useCallback(a=>{
        $setCurrent(a)
        ;(async ()=>{
            const available=await Sharing.isAvailableAsync()
            if(available){
                await Sharing.shareAsync(a.uri)
            }
        })();
    },[$setCurrent])
    return (
        <Context.Provider value={{current,setCurrent}}>
            {title && <Text style={{fontSize:12, textAlign:"center",fontWeight:"bold",marginTop:20, marginBottom:20}}>{title}</Text>}
            {dir.map(uri=>{
                const name=uri.split("/").reverse().find(a=>!!a)
                return <Folder key={uri} info={{isDirectory:true, uri, name}} open={true}  {...props}/>
            })}
        </Context.Provider>
    )
}

const Folder=({info, style, onDelete, excludes=[], ...props})=>{
    const [open, setOpen]=React.useState(props.open)
    const {current,setCurrent}=React.useContext(Context)
    const [data, setData]=React.useState([])

    React.useEffect(()=>{
        ;(async()=>{
            const files=(await FileSystem.readDirectoryAsync(info.uri))//.filter(a=>excludes.indexOf(a)==-1)
            const infos=await Promise.all(files.map(name=>FileSystem.getInfoAsync(`${info.uri}${name}`)))
            infos.forEach((a,i)=>a.name=files[i])
            setData(infos)
        })();
    },[])
    const color=React.useContext(ColorScheme)

    return (
        <View style={[{paddingLeft:10},style]}>
            {info.name && <View style={{flexDirection:"row", paddingTop:10}}>
                <Pressable onPress={e=>setOpen(!open)}>
                    <Text style={{width:20, color:color.inactive}}>{open ? "-" : "+"}</Text>
                </Pressable>
                <Pressable onPress={e=>setCurrent(info)} onLongPress={onDelete}>
                    <Text style={{color:current==info? color.active : color.inactive}}>
                        {info.name}
                    </Text>
                </Pressable>
            </View>}
            {open && <FlatList data={data} renderItem={({index, item})=>{
                    const remove=e=>FileSystem.deleteAsync(item.uri,{idempotent:true}).then(a=>{
                        const newData=[...data]
                        newData.splice(index,1)
                        setData(newData)
                    })
                    
                    if(item.isDirectory){
                        return (<Folder info={item} onDelete={remove}/>)
                    }
                    return (
                        <Pressable onPress={e=>setCurrent(item)} onLongPress={remove}>
                            <Text style={{marginLeft:30, paddingTop:10,color:current==item? color.active : color.inactive }}>
                                {item.name}
                            </Text>
                        </Pressable>
                    )
                }}
                />}
        </View>
    )
}