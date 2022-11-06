import React from "react";
import { Text, View, FlatList, StyleSheet, Pressable ,Image} from "react-native";
import { Agenda, Calendar, CalendarList, WeekCalendar, ExpandableCalendar, Timeline, AgendaList} from "react-native-calendars";
import { useDispatch, useSelector } from "react-redux";
import { PressableIcon } from "./components";
import { PolicyIcons } from "./components";
import { ColorScheme, TalkStyle } from "./default-style";

export default function Scheduler({}) {
    const color=React.useContext(ColorScheme)
    const remoteDispatch=useDispatch()
	const [{items,active,day}, dispatch] = React.useReducer((state,{type, ...payload})=>{
        switch(type){
            case "plan/slot":{
                const data=Object.values(state.items)[0]
                try{
                    return {...state, active:payload.time}
                }finally{
                    data[Math.floor(state.active?.getHalfHour()/2)]?.ref.current.deactive()
                    data[Math.floor(payload.time.getHalfHour()/2)]?.ref.current.active(payload.time) 
                }
            }
            case "plan/save":{
                const data=Object.values(state.items)[0]
                data[Math.floor(state.active.getHalfHour()/2)]?.ref.current.deactive()
                if(payload.plan.id){
                    remoteDispatch({type:"plan",plan:payload.plan})
                }
                return {...state, active:null}
            }
            case "day/data":{
                const day=timeToString(payload.day.timestamp)
                return {
                    ...state, 
                    day: new Date(payload.day.timestamp), 
                    items:{[day]:new Array(24).fill(0).map((z,i)=>({day, i,height:150, ref: React.createRef()}))}
                }
            }
        }
        return state
    },{items:{}, active: null, day});

    return (
        <Agenda testID={"agenda"} items={items} showOnlySelectedDayItems
            theme={{
                "stylesheet.agenda.main":{
                    reservations:{
                        backgroundColor:color.backgroundColor,
                        marginTop:114,
                        flex:1,
                    }
                }
            }}
            renderDay={()=>null} style={{backgroundColor:color.backgroundColor}}
            selected={'2022-11-04'}
            loadItemsForMonth={day=> dispatch({type:"day/data", day})}
            reservationsKeyExtractor={(item,index)=>`${item?.reservation?.day}-${index}`}
            renderItem={({ref, ...item}, isFirst) =><Slot {...{ref, isFirst, item, color,day,dispatch}} />}
            renderEmptyDate={() => null}
            rowHasChanged={(r1, r2) => r1.active !== r2.active}
            showClosingKnob={true}
        />
	)
}

class Slot extends React.PureComponent{
    constructor(){
        super(...arguments)
        this.state={}
    }
    deactive(){
        this.setState({active:null})
    }

    active(time){
        this.setState({active:time})
    }

    render(){
        const {active}=this.state
        const {item:{height, i,}, dispatch, color, day}=this.props
        return (
            <View style={{flex: 1, marginLeft: 40,height, marginRight:0,overflow:"visible",borderWidth:1, borderColor:"lightslategray"}}>
                <Text style={{position:"absolute",lineHeight:20,top:-10,left:-20}}>{i?i:""}</Text>
                <Pressable style={{flex:1,borderBottomWidth:1,borderBottomColor:"gray"}} 
                    onPress={e=>dispatch({type:"plan/slot", time:day.setHalfHour(i*2)})}>
                    <SlotPlan slot={i*2} day={day} height={height}/>
                </Pressable>
                <Pressable  style={{flex:1}}
                    onPress={e=>dispatch({type:"plan/slot", time:day.setHalfHour(i*2+1)})}>
                    <SlotPlan slot={i*2+1} day={day} height={height}/>
                </Pressable>
                {active && (<SlotScheduler dispatch={dispatch} time={active} height={height} style={{
                    position:"absolute", width:"100%",height:"100%", marginRight:70, 
                    backgroundColor:color.backgroundColor
                }}/>)}
            </View>
        )
    }
}

const SlotPlan=({slot, day, height=75})=>{
    const {start, coures, talk, policy}=useSelector(state=>{
        const plan={...state.plan?.[day.getFullYear()]?.[day.getWeek()]?.[day.getDay()]?.[slot]}
        if(plan && plan.id){
            plan.talk=state.talks[plan.id]
        }
        return plan
    })
    if(!coures)
        return null
    return (
        <>
            <TalkThumb item={{...talk, policy}} text={false} style={{height:65,width:80, borderWidth:0}} opacity={0.8}/>
            <SlotPlanIndicator style={{height:height*coures/2, opacity:0.4}} slot={slot}/>
        </>
    )
}

const SlotPlanIndicator=({style, slot=0, color, colors=["red","yellow"], ...props})=>(
    <View style={[{width:5,backgroundColor: color||colors[slot%2],position:"absolute",left:-6},style]} {...props}/>
)

const SlotScheduler=({time, children, height, style, ...props})=>{
    const policys=useSelector(state=>state.policy)
    const [talks, setTalks]=React.useState(useSelector(({talks={}})=>{
        return Object.keys(talks).map(id=>{
            if(!talks[id].favorited)
                return 
            return talks[id]
        }).filter(a=>!!a)
    }))

    const prev=useSelector(state=>state.plan?.[time.getFullYear()]?.[time.getWeek()]?.[time.getDay()]?.[time.getHalfHour()])
            
    /*plan:{id, policy, coures, start}*/
    const [plan, dispatch]=React.useReducer((state,{type, ...payload})=>{
            switch(type){
                case "time/inc":
                    return {...state, coures:Math.min(24-time.getHalfHour(),state.coures+1)}
                case "time/dec":
                    return {...state, coures:Math.max(1,state.coures-1)}
                case "plan":{
                    let i=talks.findIndex(a=>a.id==state.id)
                    if(i!=-1){
                        talks[i]={...talks[i]}
                        delete talks[i].policy
                    }
                    i=talks.findIndex(a=>a.id==payload.id)
                    const talk=talks[i]={...talks[i],policy:payload.policy}
                    setTalks([...talks])
                    const whitespace=talk[payload.policy]?.whitespace||policys[payload.policy].whitespace||policys.general.whitespace
                    const coures=Math.round(talk.duration*(whitespace+1)/60/30)
                    return {...state, ...payload, coures}
                }
                case "save":
                    props.dispatch?.({type:"plan/save",plan:state})
                break
            }
            return state
        },{start:time, coures:1}, init=>{
            if(prev){
                const i=talks.findIndex(a=>a.id==prev.id)
                talks[i]={...talks[i], policy:prev.policy}
                setTalks([...talks])
            }
            return prev||init
        })

    const slot=plan.start.getHalfHour()
    const initialScrollIndex=talks.findIndex(a=>a.policy)
    const thumbStyle={height:110,width:140}
    return (
        <View style={[style,{height}]} {...props}>
            <FlatList 
                data={talks}
                initialScrollIndex={initialScrollIndex}
                getItemLayout={(data,index)=>({length:thumbStyle.width, offset: thumbStyle.width*index, index})}
                renderItem={props=><TalkThumb {...props} dispatch={dispatch} style={thumbStyle}/>}
                keyExtractor={item=>item?.id}
                horizontal={true}
                />
            <View style={{width:"100%",height:30, flexDirection:"row", justifyContent:"space-around", alignItems:"center"}}>
                <PressableIcon name="file-download" onPress={e=>dispatch({type:"time/inc"})}/>
                <PressableIcon name="file-upload" onPress={e=>dispatch({type:"time/dec"})}/>
                <PressableIcon name="fullscreen-exit" onPress={e=>dispatch({type:'save'})}/>
            </View>
            <SlotPlanIndicator color="blue" style={{height:height*plan.coures/2, top:height*(slot%2)/2}}/>
        </View>
    )
}

function TalkThumb({item:{thumb,duration,title,id, policy}, style, dispatch, text=true, opacity=0.6}){
    const color=React.useContext(ColorScheme)
    const plan=policy=>dispatch?.({type:"plan",id, policy})
    return (
		<View style={[TalkStyle.thumb, style]}>
            <View style={{flex:1, opacity}}>
                <Image style={[TalkStyle.image,{height:90}]} source={{uri:thumb}}/>
                {text && <Text  style={[TalkStyle.duration,{top:0}]}>{asText(duration)}</Text>}
                {text && <Text  style={[TalkStyle.title,{overflow:"hidden",height:20}]}>{title}</Text>}
            </View>
            <View style={{position:"absolute",width:"100%",height:"100%", flexDirection:"row", justifyContent:"space-around", alignItems:"center"}}>
                {"shadowing,dictating,retelling".split(",").map(k=>(
                    (text||policy==k) && <PressableIcon color={policy==k ? color.primary : undefined}
                        key={k} name={PolicyIcons[k]} onPress={e=>plan(k)}/>
                ))}
            </View>
		</View>
	)
}

const asText=(b,a=v=>String(Math.floor(v)).padStart(2,'0'))=>`${a(b/60)}:${a(b%60)}`
const timeToString=time=>new Date(time).toISOString().split('T')[0]