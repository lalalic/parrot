import { registerRootComponent } from 'expo';
import {NativeModules} from "react-native"
import useQili from "react-native-use-qili"

useQili({apiKey:"parrot"})

import App from "./src"


if (__DEV__){
    NativeModules.DevSettings.setIsDebuggingRemotely(true)
}

registerRootComponent(App)
