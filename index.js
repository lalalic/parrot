import { registerRootComponent } from 'expo';
import App from "./src"
import {NativeModules} from "react-native"

if (__DEV__){
    NativeModules.DevSettings.setIsDebuggingRemotely(true)
}

registerRootComponent(App)
