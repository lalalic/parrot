import * as FileSystem from "expo-file-system"
import { FFmpegKit } from 'ffmpeg-kit-react-native'

async function prepareFolder(localUri){
    const folder=(segs=>(segs.pop(), segs.join("/")))(localUri.split("/"));
        
    const info = await FileSystem.getInfoAsync(folder)
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(folder, { intermediates: true })
    }
}

export default {
    async generateAudio({source, target:localUri}){
        await prepareFolder(localUri)

        const session=await FFmpegKit.execute(`-i "${source}" -vn "${localUri}"`)
        const localFileStat=await FileSystem.getInfoAsync(localUri)
        if(!localFileStat.exists){
            const logs = await session.getLogs();
            console.debug(logs.map(log=>log.getMessage()).join("\n")) 
            throw new Error(`can't download audio, check console for details`)
        }
    },

    async sliceAudio({source, start, duration, target}){
        await prepareFolder(target)
        await FFmpegKit.execute(`-ss ${start} -i "${source}" -t ${duration} -vn -c:a copy "${target}"`)
        const localFileStat=await FileSystem.getInfoAsync(target)
        if(!localFileStat.exists){
            const logs = await session.getLogs();
            console.debug(logs.map(log=>log.getMessage()).join("\n")) 
            throw new Error(`can't download audio, check console for details`)
        }
    }
}