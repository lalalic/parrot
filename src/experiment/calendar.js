import * as Calendar from "expo-calendar"
import { produce } from "immer"

export async function createEvents(store, plans, prevPlans, events=[]){
    try{
        await deleteEvents(prevPlans)
        JSON.stringify(plans, function(key,value){
            if(key=="start"){
                events.push(this)
            }
            return value
        })
        const state=store.getState()
        const {calendar}=state.plan
        const ids=await Promise.all(events.map(plan=>{
            return Calendar.createEventAsync(calendar,{
                title:`${plan.policy}`,
                startDate: plan.start,
                endDate: plan.start.setHalfHour(plan.start.getHalfHour()+plan.coures),
                calendarId:calendar,
                note: `${plan.policy}[${state.talks[plan.id].title}]`,
                url: `parrot://talk/${state.talks[plan.id].slug}/${plan.policy}`,
                alarms:[{relativeOffset:0},{relativeOffset:-10}],
            })
        }))
        store.dispatch({
            type:"plan/events", 
            events:produce(events,events=>{ids.forEach((id,i)=>events[i].eventID=id)})
        })
    }catch(e){
        console.error(e)
    }
}

export async function deleteEvents(plans, events=[]){
    try{
        JSON.stringify(plans,(key,value)=>{
            if(key=="eventID"){
                events.push(value)
            }
            return value
        })

        return await Promise.all(events.map(id=>Calendar.deleteEventAsync(id)))
    }catch(e){
        console.error(e)
    }
}