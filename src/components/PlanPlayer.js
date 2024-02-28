import React from "react"
import { View, Text } from "react-native"
import { useDispatch, useSelector, useStore, shallowEqual } from "react-redux"
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
    const {tasks=[], playing}=useSelector(({plan:{today}})=>today)||{}
    const [current, setCurrent]=React.useState(null)
    const [index, setIndex]=React.useState(-1)

    const total = useTodayPlanMonitor(tasks, dispatch, store)
    const fullComplete=React.useMemo(()=>total==tasks.length && !tasks.find(a=>!a.complete),[total, tasks])

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
                <Text style={{color:"white"}}>{total}</Text>
                {i>1 && (<Text style={{color:"yellow"}}>.{i+1}</Text>)}
            </Text>
        )
    },[total])

    const toggle=React.useCallback(()=>{
        if(!fullComplete){
            dispatch({type:"today/plan/check", togglePlaying:true})
        }
    },[fullComplete])

    useAutoStopWhenNavigating(pathname, playing, navigate, toggle)

    

    if(!pathname.startsWith("/talk/") && !pathname.startsWith("/home")){
        return null
    }

    if(!total){
        return null
    }

    if(fullComplete && !pathname.startsWith("/home")){
        return null
    }
    
    return (
        <View style={[{flex:1, alignItems:"center", justifyContent:"space-around"},style]}>
            {numbers(index)}
            <PressableIcon 
                label={l10n["Today's Plan"]} labelFade={true}
                color={fullComplete ? "green" : "yellow"} size={50}
                name={fullComplete ? "fact-check" : (playing ? "pause-circle-filled" : "play-circle-filled")}
                onPress={toggle}
                onLongPress={e=> dispatch({type:"today/plan", today:undefined})}
                />
        </View>
    )
}

function useTodayPlanMonitor(tasks, dispatch, store) {
    const [last, todayPlan] = useLast(useSelector(state => selectPlansByDay(state, new Date())))
    const changed=last.length!=todayPlan.length || !!todayPlan.find((a,i)=>!shallowEqual(a.plan, last[i].plan))
    React.useEffect(() => {
        if(!changed)
            return 
        todayPlan.forEach(a => {
            if (tasks.find(b => shallowEqual(a.plan, b.plan))?.complete)
                a.complete = true
        })
        dispatch({ type: "today/plan", today: { ...store.getState().plan.today, tasks: todayPlan } })
    }, [changed])
    return todayPlan.length
}

function useAutoStopWhenNavigating(pathname, playing, navigate, toggle) {
    const $pathname = React.useRef(pathname)
    React.useEffect(() => {
        if (playing && $pathname.current?.startsWith('/talk/') && !pathname.startsWith("/talk/")) {
            navigate
            toggle()
        }
        $pathname.current = pathname
    }, [playing, pathname])
}


function useLast(value){
    const $value=React.useRef(value)
    try{
        return [$value.current,value]
    }finally{
        $value.current=value
    }
}