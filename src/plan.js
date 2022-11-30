import React from "react";
import { Text, View, FlatList, Modal, Pressable, ScrollView} from "react-native";
import { Timeline, CalendarProvider,  ExpandableCalendar} from "react-native-calendars";
import { useDispatch, useSelector } from "react-redux";
import { Picker } from "@react-native-picker/picker"
import { MaterialIcons } from '@expo/vector-icons';

import { PressableIcon, PolicyChoice, TalkThumb, PolicyIcons, AutoHide} from "./components";
import { ColorScheme } from "./default-style";
import { selectPlansByDay } from "./store";
import { useNavigate, useLocation } from "react-router-native";

export default function Scheduler({}) {
    const color=React.useContext(ColorScheme)
    const remoteDispatch=useDispatch()
    const location=useLocation()
    
    const [{active, day}, dispatch] = React.useReducer((state,action)=>{
        const dispatch=action=>setTimeout(()=>remoteDispatch(action),0)
        switch(action.type){
            case "plan/slot":
                return {...state, active:action.time}
            case "plan/save":
                if(action.plan.id || action.plan.policy){
                    dispatch({type:"plan",plan:action.plan})
                    return {...state, active:null}
                }
            break
            case "plan/remove":
                dispatch(action)
            break
            case "plan/cancel":
                return {...state, active:null}
            case "day":
                return {...state,  day:Date.from(action.date)}
        }
        return state
    },{day: location.state?.day ?? new Date()});

    const events=useSelector(state=>selectPlansByDay(state, day))

    const [copy, setCopyMode]=React.useState(0)
    const navigate=useNavigate()

    React.useEffect(()=>{
        if(day.getTime()!=location.state?.day.getTime()){
            navigate(location.pathname,{replace:true, state:{day}})
        }
    },[day])

    return (
        <CalendarProvider date={day.asDateString()} 
            onDateChanged={(date)=>{
                dispatch({type:"day", date})
            }}>
            <ExpandableCalendar firstDay={1} />
            <Timeline 
                date={day.asDateString()}
                events={events}
                onBackgroundLongPress={time=>{
                    dispatch({type:"plan/slot", time:Date.from(time)})
                }}
                scrollToFirst
                showNowIndicator={true}
                timelineLeftInset={72}
                renderEvent={({plan,talk, width})=>{
                    return (
                        <Pressable style={{width, flex:1, flexDirection:"row"}} 
                            onPress={e=>dispatch({type:"plan/slot",time:plan.start})}
                            onLongPress={e=>dispatch({type:"plan/remove",time:plan.start})}
                            >
                            <Pressable onPress={e=>navigate(`/talk/${talk.slug}${!!plan.policy&&"/"}${plan.policy}`)}>  
                                <TalkThumb item={talk||{}} style={{width:90, height:90,margin:0}} text={false} 
                                        getLinkUri={e=>`/talk/${talk.slug}${!!plan.policy&&"/"}${plan.policy}`}>
                                    <View style={{position:"absolute",width:"100%", justifyContent:"center", alignItems:"center", padding:2}}>
                                        <MaterialIcons name={PolicyIcons[plan.policy]} color={color.primary} size={24}/>
                                    </View>
                                </TalkThumb>
                            </Pressable>  
                            <Text style={{paddingLeft:10,flex:1,flexGrow:1,color:"black"}}>
                                {`${plan.policy?.toUpperCase()||""}\n${talk?.title||""}`}
                            </Text>
                        </Pressable>
                    )
                }}
                />
                <Shortcuts day={day.asDateString()} setCopyMode={setCopyMode}
                    style={{position:"absolute", left:0, top:140, height:100, paddingLeft:10}}/>
            
                {!!active && (()=>{
                    const i=events.findIndex(a=>a.plan.start.getTime()==active.getTime())
                    return (
                        <SlotScheduler dispatch={dispatch} i={i}
                            plan={events[i]?.plan||{start:active, coures:1}}
                            nextPlan={i!=-1 ? events[i+1]?.plan : undefined}
                            height={100} style={{
                                width:"100%",
                                height:"100%", 
                                backgroundColor:color.backgroundColor
                        }}/>
                    )
                })()}

                {!!copy && <Copy day={day} cancel={()=>setCopyMode(0)} mode={copy}/>}
      </CalendarProvider>
	)
}

const Shortcuts=({day,setCopyMode, style})=>{
    const color=React.useContext(ColorScheme)
    const labelStyle={color:color.backgroundColor}
    return (
        <View style={[{justifyContent:"space-around"},style]}>
            <PressableIcon name="filter-1" 
                label="Day Copy" labelStyle={labelStyle} labelFade={true}
                onPress={e=>setCopyMode(1)}/>

            <PressableIcon name="filter-7" 
                label="Week Copy" labelStyle={labelStyle} labelFade={true}
                onPress={e=>setCopyMode(7)}/>
        </View>
    )
}

const DatePicker=({day, onValueChange, ...props})=>{
    return (
        <CalendarProvider date={day.asDateString()} onDateChanged={a=>onValueChange(Date.from(a))} {...props}>
            <ExpandableCalendar firstDay={1} initialPosition="open"/>
        </CalendarProvider>
    )
}
const Copy=({cancel, mode, ...props})=>{
    const color=React.useContext(ColorScheme)
    const [day, setDay]=React.useState(new Date(props.day.getTime()-mode*24*60*60*1000))
    const talks=useSelector(state=>{
        const plan=state.plan?.[day.getFullYear()]?.[day.getWeek()]
        const ids=new Set()
        JSON.stringify(mode==7 ? plan : plan?.[day.getDay()],(key,value)=>{
            if(key=="id"){
                ids.add(value)
            }
            return value
        })
        return Array.from(ids).filter(a=>!!a).map(id=>state.talks[id])
    })
    const rowStyle={overflow:"hidden",flexDirection:"row", alignItems:"center", height:70,borderBottomColor:"gray",borderWidth:1}
    
    const [replacements, replace]=React.useState({})
    const dispatch=useDispatch()
    const thumbStyle={height:100,width:100}

    const [datePickerVisible,showDatePicker]=React.useState(false)
    const LabelHeight=40
    return (
        <Modal  animationType="fade" transparent={true} {...props}>
            <View style={{height:120, marginTop:50, backgroundColor:color.backgroundColor, opacity:0.5, justifyContent:"center", alignItems:"center"}}>
                <Text style={{fontWeight:"bold", fontSize:20}}>{`Copy ${mode==1 ? 'Day' : "Week"} Plan`}</Text>
                <Text>!Original plan will be removed!</Text>
            </View>
            <View style={[{flex:1,flexGrow:1, width:"100%"}]}>
                <View style={{backgroundColor:"black",height:"100%"}}>
                    <Pressable onPress={e=>showDatePicker(!datePickerVisible)}
                        style={{padding:5,height:LabelHeight, justifyContent:"center",  borderBottomWidth:1, borderBottomColor:color.inactive}}>
                        <AutoHide style={{position:"absolute"}}>
                            <Text>{`Template ${mode==1 ? 'Day' : "Week"}:`}</Text>
                        </AutoHide>
                        <Text style={{textAlign:"center"}}>
                           {day.asDateString()} {"\u{B7}".repeat(3)}
                        </Text>
                    </Pressable>
                    <ScrollView style={{flex:1, flexGrow:1}}>
                        {talks.map(a=>{
                            return (
                                <View key={a.id} style={{flexDirection:"row", width:"100%", height:100, marginBottom:10}}>
                                    <TalkThumb item={a} text={false} style={thumbStyle}/>
                                    <TalkSelector filter={b=>b.favorited && a.id!=b.id && b} 
                                        thumbStyle={thumbStyle}
                                        style={{paddingLeft:5, flex:1, flexGrow:1}}>
                                        <TalkSelectedIndicator
                                            selected={replacements[a.id]} 
                                            activeColor={color.primary} 
                                            setSelected={id=>replace({...replacements, [a.id]:id})}/>
                                    </TalkSelector>
                                </View>
                            )
                        })}
                    </ScrollView>
                    {datePickerVisible && <DatePicker day={day} 
                        onValueChange={day=>{
                            if((mode==7 && day.isSameWeek(props.day)) || (mode==1 && day.asDateString()==props.day.asDateString()))
                                return false
                            setDay(day)
                        }}
                        style={{width:"100%", flex:0, overflow:"hidden", position:"absolute",top:LabelHeight}}/>}
                    
                    <View style={[rowStyle, {flexDirection:"row", justifyContent:"space-around"}]}>
                        <PressableIcon name="add-task" size={32} 
                            onPress={e=>{
                                dispatch({type:`plan/copy/${mode}`, replacements, day:props.day, templateDay:day})
                                cancel()
                            }}/>
                        <PressableIcon name="cancel" size={32} onPress={cancel}/>
                    </View>
                </View>
            </View>
        </Modal>
    )
}

function SlotScheduler({dispatch, nextPlan, style,...props}){
    const color=React.useContext(ColorScheme)
    const rowStyle={overflow:"hidden",flexDirection:"row", alignItems:"center", height:70,borderBottomColor:"gray",borderWidth:1}
    
    const [plan, setPlan]=React.useState(props.plan)
    const i=plan.start?.getHalfHour()||0
    return (
        <Modal  animationType="fade" transparent={true} {...props}>
            <View style={[{padding:4, overflow:"hidden", position:"absolute", top:200, height:400, flex:1, width:"100%"}]}>
                <View style={{backgroundColor:"black"}}>
                    <View style={rowStyle}>
                        <TimeSelector selectedValue={i} style={{flexGrow:1}} enabled={false}/>
                    </View>
                    <View style={rowStyle}>
                        <TimeSelector min={i+1} style={{flexGrow:1}} 
                            max={nextPlan?.start.getHalfHour()||48} 
                            selectedValue={i+plan.coures} 
                            onValueChange={value=>setPlan({...plan, coures:value-i})}/>
                    </View>
                    <PolicyChoice style={rowStyle} value={plan.policy}
                        onValueChange={policy=>setPlan({...plan, policy})}
                        />
                    <TalkSelector style={[rowStyle, {height:130, topMargin:10, alignItems:undefined}]}>
                        <TalkSelectedIndicator 
                            selected={plan.id} 
                            activeColor={color.primary} 
                            setSelected={id=>setPlan({...plan, id: id==plan.id ? null : id})}/>
                    </TalkSelector>
                    <View style={[rowStyle, {flexDirection:"row", justifyContent:"space-around"}]}>
                        <PressableIcon name="add-task" size={32} 
                            onPress={e=>dispatch({type:"plan/save", plan})}/>
                        <PressableIcon name="cancel" size={32} onPress={e=>dispatch({type:"plan/cancel"})}/>
                    </View>
                </View>
            </View>
        </Modal>
    )
}

const TimeSelector=({style, min=0, max=48, ...props})=>{
    const color=React.useContext(ColorScheme)
    return (
        <Picker style={style} mode="dropdown" itemStyle={{color:color.text}} {...props}>
            {new Array(49).fill(0).map((a,index)=>{
                if(index>=min && index<=max){
                    const label=`${String(Math.floor(index/2)).padStart(2,"0")}:${String(index%2*30).padStart(2,"0")}`
                    return <Picker.Item key={index} label={label} value={index}/>
                }
            })}
        </Picker>
    ) 
}

const TalkSelector=({thumbStyle={height:110,width:140}, selected, children, filter=a=>(a.favorited && a), ...props})=>{
    const [talks]=React.useState(useSelector(({talks={}})=>{
        return Object.keys(talks).map(id=>{
            return filter(talks[id])
        }).filter(a=>!!a)
    }))

    return (
        <FlatList 
            data={talks}
            getItemLayout={(data,index)=>({length:thumbStyle.width, offset: thumbStyle.width*index, index})}
            renderItem={props=><TalkThumb {...props} style={thumbStyle} children={children}/>}
            keyExtractor={item=>item?.id}
            horizontal={true}
            initialScrollIndex={talks.indexOf(a=>a.id==selected)}
            extraData={selected}
            {...props}
            />
    )
}

const TalkSelectedIndicator=({talk, selected, activeColor, setSelected})=>{
    return (
        <View style={{position:"absolute",width:"100%", height:"100%", justifyContent:"center", alignItems:"center"}}>
            <PressableIcon color={talk.id==selected ? activeColor : undefined} 
                name="check-circle-outline" size={32}
                onPress={e=>setSelected?.(talk.id)}
                />
        </View>
    )
}