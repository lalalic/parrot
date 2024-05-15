import * as FileSystem from "expo-file-system"
import { Qili, getSession} from "react-native-use-qili/store"

const root=`${FileSystem.documentDirectory}download`
FileSystem.makeDirectoryAsync(root,{intermediates:true})
let uuid=Date.now()
export default {
    upload(){

    },
    createAssistant(){

    },
    recordAudio(){

    },
    audio(markdown/*[title](#audio?url=...)*/){
        const matched=Audio.exec(markdown.trim())
        if(!matched)
            return 
        let {groups:{url, title}}=matched
        url=decodeURIComponent(url)
        const ext=url.split(".").pop()
        return {
            type:'audio',
            url, 
            title,
            get file(){
                if(this.__fileName){
                    return Promise.resolve(this.__fileName)
                }
                const file=this.__fileName=`${root}/${uuid++}.${ext}`
                return FileSystem.downloadAsync(this.url, file).then(()=>file)
            },
            get dataURI(){
                return this.file
                    .then(file=>FileSystem.readAsStringAsync(file, {encoding:"base64"}))
                    .then(data=>`data:audio/${ext};base64,${data}`)
            }
        }
    },
    image(markdown/*![title](url)*/){
        const matched=Image.exec(markdown.trim())
        if(!matched)
            return 
        
        const {groups:{url, title}}=matched
        
        return {
            type:'image',
            url,
            title,
            get file(){
                if(this.__fileName){
                    return Promise.resolve(this.__fileName)
                }
                const file=this.__fileName=`${root}/${uuid++}.jpg`
                return FileSystem.downloadAsync(this.url, file).then(()=>file)
            },
            get dataURI(){
                return this.file
                    .then(file=>FileSystem.readAsStringAsync(file, {encoding:"base64"}))
                    .then(data=>`data:image/jpg;base64,${data}`)
            }
        }
    },
    parse(prediction){
        prediction=prediction.trim()
        const a=prediction[0]
        return (a=="!" && this.image(prediction)) || (a=="[" && this.audio(prediction)) || prediction
    },

    async uploadDataURI(dataURI, key){
        const [type,data]=dataURI.split(/[,，]/g)
        const [,ext,]=type.split(/[\/;]/)
        key = key || `_temp_/10/${uuid++}.${ext}`
        const file=`${root}/${key.split("/").pop()}`
        await FileSystem.writeAsStringAsync(file, data, {encoding: FileSystem.EncodingType.Base64})
        const url=await Qili.upload({file, key}, getSession())
        return {url, file}
    },
}

const Image=/^\!\[(?<title>.*)\]\((?<url>.*)\)$/s
const Audio=/^\[(?<title>.*)\]\(#audio\?url=(?<url>.*)\)$/s
const Command=/^\[(?<title>.*)\]\(#()(?<url>.*)\)$/