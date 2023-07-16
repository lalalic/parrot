import { registerRootComponent } from 'expo';
import {NativeModules} from "react-native"
import useQili from "react-native-use-qili"

useQili({
    apiKey:"parrot",
    api: __DEV__ ? "http://localhost:9080/1/graphql" : undefined,
    bridge:{
        accessToken:""
    }
})


if (__DEV__){
    NativeModules.DevSettings.setIsDebuggingRemotely(true)
}

registerRootComponent(require("./src").default)
