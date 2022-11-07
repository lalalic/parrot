import React from "react";
import { Text, View, FlatList, Modal} from "react-native";
import { Timeline, CalendarProvider,  ExpandableCalendar, TimelineList} from "react-native-calendars";
import { useDispatch, useSelector, useStore } from "react-redux";
import { PressableIcon, PolicyChoice, TalkThumb} from "./components";
import { ColorScheme } from "./default-style";
import { Picker } from "@react-native-picker/picker"

export default function Scheduler({}) {
    const color=React.useContext(ColorScheme)
    const remoteDispatch=useDispatch()
	const store=useStore()

    const getEvents=(day)=>{
        return (state => {
            const events = state.plan?.[day.getFullYear()]?.[day.getWeek()]?.[day.getDay()];
            if (!events)
                return [];
            return Object.values(events).map(plan => {
                return {
                    start: plan.start.asDateTimeString(),
                    end: new Date(plan.start.getTime() + plan.coures * 30 * 60 * 1000).asDateTimeString(),
                    title: state.talks[plan.id].title,
                    summary: state.talks[plan.id].desc,
                    plan,
                };
            });
        })(store.getState());
    }
    
    const [{events,active, day}, dispatch] = React.useReducer((state,{type, ...payload})=>{
        switch(type){
            case "plan/slot":
                return {...state, active:payload.time}
            case "plan/save":{
                const data=Object.values(state.events)[0]
                remoteDispatch({type:"plan",plan:payload.plan})
                return {...state, active:null}
            }
            case "plan/cancel":
                return {...state, active:null}
            case "day":{
                const day=Date.from(payload.date)
                return {...state,  day,  events:getEvents(day)}
            }
        }
        return state
    },{day:new Date(),events:getEvents(new Date())});
    
    return (
        <CalendarProvider date={new Date().asDateString()} 
            onDateChanged={(date)=>dispatch({type:"day", date})}>
            <ExpandableCalendar firstDay={1}/>
                {day && <Timeline 
                    date={day.asDateString()}
                    events={events}
                    onBackgroundLongPress={time=>{
                        dispatch({type:"plan/slot", time:Date.from(time)})
                    }}
                    showNowIndicator={true}
                    timelineLeftInset={72}
                    scrollToFirst
                    initialTime={{hour: 9, minutes: 0}}
                    />}

                {active && (<SlotScheduler dispatch={dispatch} 
                    plan={((init)=>{
                        return events.find(a=>a.plan.start.getTime()==init.start.getTime())?.plan||init
                    })({start:active, coures:1})}
                    height={100} style={{
                        width:"100%",
                        height:"100%", 
                        backgroundColor:color.backgroundColor
                }}/>)}
      </CalendarProvider>
	)
}


const SlotScheduler=({dispatch, style,  ...props})=>{
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
                        <TimeSelector start={i} selectedValue={i+plan.coures} style={{flexGrow:1}} 
                            onValueChange={value=>setPlan({...plan, coures:value-i})}/>
                    </View>
                    <PolicyChoice style={rowStyle} value={plan.policy}
                        onValueChange={policy=>setPlan({...plan, policy})}
                        />
                    <FavoriteTalkSelector style={[rowStyle, {height:130, topMargin:10, alignItems:undefined}]}>
                        <TalkSelectedIndicator 
                            selected={plan.id} 
                            activeColor={color.primary} 
                            setSelected={id=>setPlan({...plan, id: id==plan.id ? null : id})}/>
                    </FavoriteTalkSelector>
                    <View style={[rowStyle, {flexDirection:"row", justifyContent:"space-around"}]}>
                        <PressableIcon name="add-task" size={32} onPress={e=>dispatch({type:"plan/save", plan})}/>
                        <PressableIcon name="cancel" size={32} onPress={e=>dispatch({type:"plan/cancel"})}/>
                    </View>
                </View>
            </View>
        </Modal>
    )
}

const TimeSelector=({style, start=-1, ...props})=>{
    const color=React.useContext(ColorScheme)
    return (
        <Picker style={[{}, style]} mode="dropdown" itemStyle={{color:color.text}} {...props}>
            {new Array(48).fill(0).map((a,index)=>{
                if(index>start){
                    const label=`${String(Math.floor(index/2)).padStart(2,"0")}:${String(index%2*30).padStart(2,"0")}`
                    return <Picker.Item key={index} label={label} value={index}/>
                }
            })}
        </Picker>
    ) 
}

const FavoriteTalkSelector=({thumbStyle={height:110,width:140}, selected, children, ...props})=>{
    const [talks]=React.useState(useSelector(({talks={}})=>{
        return Object.keys(talks).map(id=>{
            if(!talks[id].favorited)
                return 
            return talks[id]
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