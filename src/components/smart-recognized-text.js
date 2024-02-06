import { useSelector} from "react-redux"
import { diffPretty } from '../experiment/diff'


export default function SmartRecognizedText({cue:{text, test=text, time, end}, id, policy}){
    const recognized=useSelector(({talks})=>talks[id]?.[policy]?.records?.[`${time}-${end}`])
    if(recognized){
        const [label, , score]=diffPretty(test, recognized)
        return (score&&score!=100 ? `${score}: ` : '')+label
    }
    return test
}