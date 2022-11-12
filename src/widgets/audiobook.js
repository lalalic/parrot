import { PressableIcon } from "../components";
import {selectAudioBook} from "../store"
import { ListMedia } from "./media";

export default class SpellNamePractice extends ListMedia {
    static defaultProps = {
        ...super.defaultProps,
        id: "audiobook",
        slug: "audiobook",
        title: "record audio as your language material",
        thumb: require("../../assets/favicon.png"),
        description: "This widget will help you to manage your audio book",
        tags:["Vocabulary","Speak","Grammar"],
    }

    constructor(){
        super(...arguments)
        this.state.tag=null
    }

    createTranscript(){
        const audiobook=selectAudioBook(this.state.tag)
        audiobook.reduce((cues,{duration, text},i)=>{
            const time=i==0 ? 0 : cues[i-1].end
            cues.push({text, time, end:time+duration+this.offsetTolerance})
            return cues
        },this.cues)
    }

    componentDidUpdate(props, state){
        if(this.state.tag!=state.tag){
            this.doCreateTranscript()
        }
    }

    renderAt(){
        const toggle=k=>this.setState({tag:this.state.tag==k ? undefined : k})
        return (
            <>
                <View style={{flexDirection:"row"}}>
                    <PressableIcon name="mic" onPress={e=>toggle("Vocabulary")}/>
                    <PressableIcon name="record-voice-over"onPress={e=>toggle("Speak")}/>
                    <PressableIcon name="grading"onPress={e=>toggle("Grammar")}/>
                </View>
                {super.renderAt()}
            </>
        )
    }
}
