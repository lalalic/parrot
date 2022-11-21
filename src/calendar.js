import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";

export default (()=>{
    const middleware=createListenerMiddleware()
    middleware.startListening({
        matcher(){
            debugger
        },
        effect(action, api){

        }
    })
    return middleware
})();


