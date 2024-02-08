import { produce } from "immer";

export default function message(state=[],action){
    switch(action.type){
        case "message":
            return [...state, action.message]
        case "message/remove":
            return produce(state, $messages=>{
                action.messages.forEach(a=>{
                    const i=$messages.indexOf(a)
                    if(i!=-1){
                        $messages.splice(i,1)
                    }
                })
            }) 
    }
    return state
}