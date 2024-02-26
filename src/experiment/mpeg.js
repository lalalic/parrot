import * as FileSystem from "expo-file-system"
import { FFmpegKit, FFmpegKitConfig } from 'ffmpeg-kit-react-native'
import prepareFolder from "react-native-use-qili/components/prepareFolder";

export default {
    async generateAudio({source, target:localUri}, logFx){
        if((await FileSystem.getInfoAsync(localUri)).exists)
            return 

        await prepareFolder(localUri)

        if(logFx){
            FFmpegKitConfig.enableLogCallback(log => {
                logFx(log.getMessage())
            });
        }

        await FFmpegKit.execute(`-i "${source}" -vn "${localUri}"`)
        const localFileStat=await FileSystem.getInfoAsync(localUri)
        if(!localFileStat.exists){
            throw new Error(`can't download audio, check console for details`)
        }
    },

    async sliceAudio({source, start, duration, target}){
        await prepareFolder(target)
        await FFmpegKit.execute(`-ss ${start} -i "${source}" -t ${duration} -vn -c:a copy "${target}"`)
        const localFileStat=await FileSystem.getInfoAsync(target)
        if(!localFileStat.exists){
            throw new Error(`can't download audio, check console for details`)
        }
    }
}