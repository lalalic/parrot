import { requireNativeComponent, NativeModules } from "react-native";

export const CoreMLImage = requireNativeComponent("CoreMLImage")
export const { TrainPlayer, NowPlaying } = NativeModules
