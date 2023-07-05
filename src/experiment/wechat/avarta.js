import React from "react"
import { Image, View } from "react-native"
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useWeChat } from "./use-wechat"
import useStateAndLatest from "use-qili/components/useStateAndLatest"
import prepareFolder from "use-qili/components/prepareFolder"
import * as FileSystem from "expo-file-system"

export default function Avarta({user,size=30}){
    const {service}=useWeChat()
    const style={backgroundColor:"black", borderRadius:4,marginRight:4}
    const [uri, setUri, $uri]=useStateAndLatest("")

    React.useEffect(()=>{
        if(user._id=="bot")
            return 
        async function update(){
            if($uri.current){
                return 
            }
            const localThumb=await getLocalThumb(user)
            if(localThumb){
                setUri(localThumb)
                return 
            }

            const thumb=user.thumb || (await service["glue.contactFactory.getContact"](user.id)).thumb
            if(thumb){
                const data=await service.toThumbURI(thumb)
                if(data){
                    setUri(data)
                    saveLocalThumb(user, data)
                }
            }
        }

        update()
        service.on('addContacts',update)
    },[user])

    if(user._id=="bot"){
        return <MaterialIcons name="adb" size={size} style={style} />
    }

    return (
        <View pointerEvents="none" 
            style={[{overflow:"hidden", width:size,height:size,padding:2},style]}>
            {uri ? <Image style={{width:"100%",height:"100%", borderRadius:4}} source={{uri}}/> : null}
        </View>
    )
}

const root=`${FileSystem.documentDirectory}wechat/thumbs`
let caches=null

async function getLocalThumb({_id, id=_id}){
    try{
        if(!caches){
            await prepareFolder(`${root}/a.png`)
            const files=await FileSystem.readDirectoryAsync(root)
            caches=files.reduce((cache, a)=>{
                cache[a.split(".")[0]]=1
                return cache
            },{})
            console.debug({cache:"thumbs", data:Object.keys(caches)})
        }
        return caches[id] && `${root}/${id}.png`
    }catch(e){
        console.error(e)
    }
}

async function saveLocalThumb({_id, id=_id}, dataURI){
    try{
        const [,data]=dataURI.split(",")
        await FileSystem.writeAsStringAsync(`${root}/${id}.png`, data, {encoding: FileSystem.EncodingType.Base64})
        caches[id]=1
        console.debug(`saved thumb for ${id}.`)
    }catch(e){
        console.error(e)
    }
}