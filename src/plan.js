import React from "react";
import { Text, View, Modal, Pressable, ScrollView} from "react-native";
import { Timeline, CalendarProvider,  ExpandableCalendar, LocaleConfig} from "react-native-calendars";
import { useDispatch, useSelector, useStore } from "react-redux";
import Select from "react-native-select-dropdown"
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { PolicyChoice, TalkThumb, TalkSelector} from "./components";
import AutoHide from "./components/AutoHide";
import PressableIcon from "react-native-use-qili/components/PressableIcon";
import { ColorScheme } from "react-native-use-qili/components/default-style";
import { selectPlansByDay } from "./store/reducers/plan";
import { useNavigate, useLocation } from "react-router-native";
import produce from "immer";
import PolicyIcons from "./components/PolicyIcons";

const l10n=globalThis.l10n

const thumbStyle={height:100,width:100, borderWidth:1, borderColor:"gray"}
const imageStyle={transform:[{scale:0.5}]}

export default function Scheduler() {
    const store=useStore()
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
        if(day.asDateString()!=location.state?.day.asDateString()){
            navigate(location.pathname,{replace:true, state:{day}})
        }
    },[day])

    const plans=useSelector(state=>state.plan)
    const planedDates=React.useMemo(()=>{
        const y=day.getFullYear(), planed={}
        const w=Date.from(`${y}-${day.getMonth()+1}-01`).getWeek()
        for(let i=w;i<w+5;i++){
            const weekPlan=plans?.[y]?.[i]
            if(!weekPlan)
                continue
            Object.keys(weekPlan).forEach(d=>{
                const ywd=Date.fromWeek(y,i,parseInt(d)).asDateString()
                const dayPlan=weekPlan?.[d]
                
                planed[ywd]={
                    dots: Array.from(Object.values(dayPlan).reduce((types, a)=>{
                        types.add(PlanPolicyDots[a.policy||'*'])
                        return types
                    },new Set())).sort((a,b)=>a.key.charCodeAt(0)-b.key.charCodeAt(0))
                }
            })
        }
        return planed
    },[plans, day.getFullYear(), day.getMonth()])

    return (
        <CalendarProvider date={day.asDateString()} 
            onDateChanged={(date)=>{
                dispatch({type:"day", date})
            }}>
            <ExpandableCalendar firstDay={1} 
                markedDates={planedDates}
                markingType="multi-dot"
                disableWeekScroll={true/*otherwise day will be reset to today*/}/>
            <Timeline 
                date={day.asDateString()}
                events={events}
                onBackgroundLongPress={time=>{
                    dispatch({type:"plan/slot", time:Date.from(time)})
                }}
                scrollToFirst={true}
                showNowIndicator={true}
                timelineLeftInset={72}
                renderEvent={({plan,width})=>{
                    const talk=store.getState().talks[plan.id]
                    return (
                        <View style={{flex:1, flexDirection:"row", alignItems:"center"}}>
                            <TalkThumb item={talk||{}} text={false}
                                style={{width:24, height:24,margin:0, borderWidth:0}} 
                                policy={plan.policy}
                                >
                                <View style={{position:"absolute",width:"100%", justifyContent:"center", alignItems:"center", padding:2}}>
                                    <MaterialIcons name={PolicyIcons[plan.policy]} color={PlanPolicyDots[plan.policy].color} size={24}/>
                                </View>
                            </TalkThumb>
                            <Pressable style={{flex:1}}  
                                onPress={e=>dispatch({type:"plan/slot",time:plan.start})}> 
                                <Text style={{paddingLeft:10,color:"black"}}>
                                    {`${talk?.title||""}`}
                                </Text>
                            </Pressable>
                            <PressableIcon name="remove-circle-outline" 
                                onPress={e=>dispatch({type:"plan/remove",time:plan.start})}/>
                        </View>
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
                label={l10n["Day Copy"]} labelStyle={labelStyle} labelFade={true}
                onPress={e=>setCopyMode(1)}/>

            <PressableIcon name="filter-7" 
                label={l10n["Week Copy"]} labelStyle={labelStyle} labelFade={true}
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
        return Array.from(ids)
            .filter(a=>!!a)
            .map(id=>{
                const {title, slug, thumb}=state.talks[id]
                return {id, title, slug, thumb:globalThis.Widgets[slug]?.defaultProps?.thumb}
            })
    })
    const rowStyle={overflow:"hidden",flexDirection:"row", alignItems:"center", height:70,borderBottomColor:"gray",borderWidth:1}
    
    const [replacements, replace]=React.useState({})
    const dispatch=useDispatch()
    
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
                            <Text>{l10n[`Template ${mode==1 ? 'Day' : "Week"}:`]}</Text>
                        </AutoHide>
                        <Text style={{textAlign:"center"}}>
                           {day.asDateString()} {"\u{B7}".repeat(3)}
                        </Text>
                    </Pressable>
                    <ScrollView style={{flex:1, flexGrow:1}}>
                        {talks.map(a=>{
                            return (
                                <View key={a.id} style={{flexDirection:"row", width:"100%", height:110, marginBottom:10}}>
                                    <TalkThumb item={a} text={true} duration={false}
                                        imageStyle={imageStyle}
                                        titleStyle={{fontSize:10}}
                                        style={thumbStyle}>
                                        {!replacements[a.id] &&  (
                                            <TalkSelectedIndicator talk={a}
                                            selected={a.id} 
                                            activeColor={color.primary}/>
                                        )}
                                    </TalkThumb>
                                    <TalkSelector 
                                        filter={b=>b.favorited && a.id!=b.id && b} 
                                        thumbStyle={thumbStyle}
                                        imageStyle={imageStyle}
                                        durationStyle={false}
                                        titleStyle={{fontSize:10}}
                                        style={{paddingLeft:5, flex:1, flexGrow:1}}>
                                        <TalkSelectedIndicator
                                            selected={replacements[a.id]} 
                                            activeColor={color.primary} 
                                            setSelected={id=>
                                                replace(produce(replacements, $replacements=>{
                                                    if($replacements[a.id]==id)
                                                        delete $replacements[a.id]
                                                    else
                                                        $replacements[a.id]=id
                                                }))
                                            }/>
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
    const rowStyle={overflow:"hidden",flexDirection:"row", alignItems:"center", height:70,borderBottomColor:"gray",borderWidth:0}
    
    const policys=React.useMemo(()=>Object.keys(PolicyIcons),[])

    const [plan, setPlan]=React.useState(props.plan)
    const i=plan.start?.getHalfHour()||0
    const store=useStore()
    const widgetPolicyExcludes=React.useMemo(()=>{
        if(!plan.id)
            return policys
        const talk=store.getState().talks[plan.id]
        const Widget=globalThis.Widgets[talk.slug]
        const excludes= ["general", ...Widget?.defaultProps?.exludePolicy]
        if(policys.length-excludes.length==1){
            setPlan({...plan, policy:policys.find(a=>excludes.indexOf(a)==-1)})
        }
        return excludes
    },[plan.id])
    return (
        <Modal  animationType="fade" transparent={true} {...props}>
            <View style={[{padding:4, overflow:"hidden", position:"absolute", top:200, height:400, flex:1, width:"100%"}]}>
                <View style={{backgroundColor:"black"}}>
                    <View style={[rowStyle,{padding:30, justifyContent:"space-evenly"}]}>
                        <TimeSelector 
                            buttonStyle={{backgroundColor:"gray"}}
                            selectedValue={i} 
                            defaultButtonText={l10n["Start Time"]}
                            disabled={true}/>
                        
                        <TimeSelector min={i+1} 
                            defaultButtonText={l10n["End Time"]}
                            max={nextPlan?.start.getHalfHour()||48} 
                            selectedValue={i+plan.coures} 
                            onValueChange={value=>setPlan({...plan, coures:value-i})}/>
                    </View>
                    <TalkSelector 
                        imageStyle={imageStyle}
                        thumbStyle={thumbStyle}
                        durationStyle={false}
                        titleStyle={{fontSize:10}}
                        style={[rowStyle, {height:130, topMargin:10, alignItems:undefined}]}>
                        <TalkSelectedIndicator 
                            selected={plan.id} 
                            activeColor={color.primary} 
                            backgroundColor={color.backgroundColor}
                            setSelected={id=>setPlan({...plan, id: id==plan.id ? null : id})}/>
                    </TalkSelector>

                    <PolicyChoice style={rowStyle} 
                        color="white"
                        value={plan.policy} 
                        excludes={widgetPolicyExcludes}
                        onValueChange={policy=>setPlan({...plan, policy})}
                        />
                        
                    <View style={[rowStyle, {flexDirection:"row", justifyContent:"space-around"}]}>
                        <PressableIcon name="add-task" size={32} color="white"
                            onPress={e=>!!plan.policy && !!plan.id && dispatch({type:"plan/save", plan})}/>
                        <PressableIcon name="cancel" size={32} color="white"
                            onPress={e=>dispatch({type:"plan/cancel"})}/>
                    </View>
                </View>
            </View>
        </Modal>
    )
}

const AllTime=new Array(49).fill(0).map((a,index)=>({
    label:`${String(Math.floor(index/2)).padStart(2,"0")}:${String(index%2*30).padStart(2,"0")}`,
    value:index,
}))

const TimeSelector=({style, min=0, max=48, selectedValue, onValueChange, ...props})=>{
    const data=React.useMemo(()=>AllTime.filter((a,index)=>index>=min && index<=max),[min, max])
    const i=React.useMemo(()=>data.findIndex(a=>a.value==selectedValue),[selectedValue, data])
    return (
        <Select 
            data={data}
            buttonStyle={style} 
            defaultValueByIndex={i}
            rowTextForSelection={a=>a.label}
            buttonTextAfterSelection={a=>a.label}
            onSelect={a=>onValueChange(a.value)}
            {...props}
            />
    ) 
}

const TalkSelectedIndicator=({talk, selected, activeColor,backgroundColor, setSelected})=>{
    return (
        <View style={{position:"absolute",width:"100%", height:"100%", justifyContent:"center", alignItems:"center"}}>
            <PressableIcon color={talk.id==selected ? activeColor : undefined} 
                style={{backgroundColor}}
                name="check-circle-outline" size={32}
                onPress={e=>setSelected?.(talk.id)}
                />
        </View>
    )
}

const PlanPolicyDots={
    shadowing:{key:"shadowing", color:"red"},
    dictating:{key:"dictating",color:"blue"},
    retelling:{key:"retelling", color:"green"},
    '*':{key:"NA", color:"gray"}
}

;(()=>{
    const lang=l10n.getLanguage()
    const Default=LocaleConfig.locales[""]
    LocaleConfig.locales[lang]={
        monthNames:Default.monthNames.map(a=>l10n[a]),
        monthNamesShort:Default.monthNamesShort.map(a=>l10n[a]),
        dayNames:Default.dayNames.map(a=>l10n[a]),
        dayNamesShort:Default.dayNamesShort.map(a=>l10n[a]),
        today:l10n.today,
        amDesignator:l10n[Default.amDesignator],
        pmDesignator:l10n[Default.pmDesignator],
    }
    LocaleConfig.defaultLocale=lang
})();