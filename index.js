import { registerRootComponent } from 'expo';
import App from "./src"
import {NativeModules} from "react-native"

import WebSocketInterceptor from "react-native/Libraries/WebSocket/WebSocketInterceptor"


if (__DEV__){
    NativeModules.DevSettings.setIsDebuggingRemotely(true)
    WebSocketInterceptor.enableInterception()
}

registerRootComponent(App)
