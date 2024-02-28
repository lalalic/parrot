import React from "react"
import { View, Text } from "react-native"
import { useDispatch, useSelector, useStore } from "react-redux"
import PressableIcon from "react-native-use-qili/components/PressableIcon"
import { useLocation, useNavigate } from "react-router-native"
import { selectPlansByDay } from "../store/reducers/plan"

/**
 * to provide a a way to control 
 *  > stop
 * to display progress information
 *  > left tasks
 * scenario: 
 *  > pocket mode: one by one
 *  > superviser
 * @param {*} param0 
 * @returns 
 */
export default function PlanPlayer({style}){
    const store=useStore()
    const dispatch=useDispatch()
    const navigate=useNavigate()
    const {pathname}=useLocation()
    const $pathname=React.useRef(pathname)
    const total=useSelector(state=>selectPlansByDay(state, new Date())?.length)
    const {tasks=[], playing}=useSelector(({plan:{today}})=>today)||{}
    const [current, setCurrent]=React.useState(null)
    const [index, setIndex]=React.useState(-1)

    React.useEffect(()=>{
        const i=tasks.findIndex(({complete})=>!complete)
        setCurrent(tasks[i])
        setIndex(i)
    },[tasks])

    React.useEffect(()=>{
        if(current && playing){
            const talk=store.getState().talks[current.plan.id]
            navigate(`/talk/${talk.slug}/${current.plan.policy}/${current.plan.id}/autoplay`)
        }
    },[current, playing])

    const numbers=React.useCallback((i)=>{
        return (
            <Text style={{color:"yellow"}}>
                <Text style={{color:"white"}}>{l10n["today"]}:{total}</Text>
                {i!=-1 && (<Text style={{color:"yellow"}}>.{i+1}</Text>)}
            </Text>
        )
    },[total])

    const toggle=React.useCallback(()=>{
        if(!fullComplete){
            dispatch({type:"today/plan/check", togglePlaying:true})
        }
    },[fullComplete])

    React.useEffect(()=>{
        if(playing && $pathname.current?.startsWith('/talk/') && !pathname.startsWith("/talk/")){
            toggle()
        }
        $pathname.current=pathname
    },[playing, pathname])

    if(!pathname.startsWith("/talk/") && !pathname.startsWith("/home")){
        return null
    }

    if(!total){
        return null
    }

    const fullComplete=total==tasks.length && !tasks.find(a=>!a.complete)
    if(fullComplete && !pathname.startsWith("/home")){
        return null
    }
    
    return (
        <View style={[{flex:1, alignItems:"center", justifyContent:"space-around"},style]}>
            <PressableIcon 
                color={fullComplete ? "green" : "yellow"} size={50}
                name={fullComplete ? "fact-check" : (playing ? "pause-circle-filled" : "play-circle-filled")}
                onPress={toggle}
                onLongPress={e=> dispatch({type:"today/plan", today:undefined})}
                />
            {numbers(index)}
        </View>
    )
}