import React from "react"
import { TextInput, View, Text } from "react-native"
import { useDispatch, useSelector } from "react-redux"

export default function Schedule(){
    const schedule=useSelector(state=>state.wechat.schedule)
    const dispatch=useDispatch()
    return (
        <View style={{flex:1, justifyContent:"center",paddingRight:30}}>
            <View style={{alignItems:"center",marginBottom:20}}>
                <Text style={{fontSize:20}}>
                    Autobot Schedule
                </Text>
            </View>

            <Field label="every day" 
                start={schedule['*']?.start}
                end={schedule['*']?.end}
                onStartChange={start=>dispatch({type:'wechat/schedule', key:"*", payload:{start}})} 
                onEndChange={end=>dispatch({type:'wechat/schedule', key:"*", payload:{end}})}
                />
            {new Array(7).fill(0).map((a,i)=>(
                <Field label={days[i]} key={i}
                    start={schedule[i+""]?.start}
                    end={schedule[i+""]?.end}
                    onStartChange={start=>dispatch({type:'wechat/schedule', key:i+"", payload:{start} })} 
                    onEndChange={end=>dispatch({type:'wechat/schedule', key:i+"", payload:{end}})}
                    />
            ))}
        </View>
    )
}

const days=["Sunday","Monday","Tuesday","Wensday","Thursday","Friday","Saturday"]

function Field({label, start, end, onStartChange, onEndChange}){
    const checkTime=React.useCallback(text=>{
        return text.length>0
    },[])
    const inputStyle=React.useMemo(()=>({borderBottomWidth:1, borderColor:"gray",padding:5,color:"yellow"}),[])
    return (
        <View style={{flexDirection:"row", justifyContent:"space-evenly", height:50}}>
            <View style={{flex:1, justifyContent:"flex-end",paddingBottom:5}}>
                <Text style={{textAlign:"right",paddingRight:10}}>{label}</Text>
            </View>

            <View style={{flex:1, justifyContent:"flex-end", marginRight:20}}>
                <TextInput style={inputStyle} defaultValue={start}
                    onEndEditing={({nativeEvent:{text}})=>{
                        text=text.trim()
                        if(checkTime(text)){
                            onStartChange?.(text)
                        }
                    }}/>
            </View>

            <View style={{flex:1, justifyContent:"flex-end"}}>
                <TextInput style={inputStyle} defaultValue={end}
                    onEndEditing={({nativeEvent:{text}})=>{
                        text=text.trim()
                        if(checkTime(text)){
                            onEndChange?.(text)
                        }
                    }}/>
            </View>
        </View>
    )
}