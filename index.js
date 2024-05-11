import { registerRootComponent } from 'expo';
import {NativeModules} from "react-native"
import useQili from "react-native-use-qili"
import "symbol-observable"
useQili({
    apiKey:"parrot",
    bridge:{
        accessToken:"1f3d3deb-c421-422f-bc3d-48e38f2c6c8f"
    },
    chatflow:"2d15399e-a402-43ef-9dc1-02475210209a"
})


if (__DEV__){
    NativeModules.DevSettings.setIsDebuggingRemotely(true)
}

registerRootComponent(require("./src").default)