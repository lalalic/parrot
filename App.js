import React from "react"
import Router from "./src/router"
import {Provider} from "./src/store"

export default ()=>(
    <Provider>
        <Router/>
    </Provider>
)