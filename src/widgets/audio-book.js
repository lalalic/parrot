import { View } from "react-native"
import { PressableIcon } from "../components";
import { selectAudioBook } from "../store"
import { ListMedia } from "./media";

export default class AudioBook extends ListMedia {
    static defaultProps = {
        ...super.defaultProps,
        id: "audiobook",
        slug: "audiobook",
        title: "Record audio as practice material",
        thumb: require("../../assets/widget-audio-book.jpeg"),
        description: "manage audio book in 3 tags (Vocabulary, Speak, Grammar) and practise them",
        tags:["Vocabulary","Speak","Grammar"],
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
                <View style={{flexDirection:"row",width:"100%", justifyContent:"space-around"}}>
                    <PressableIcon name="mic" style={{backgroundColor:"red"}}
                        onPress={e=>(alert(1),toggle("Vocabulary"))} />
                    <PressableIcon name="record-voice-over"  style={{backgroundColor:"blue"}}
                        onPress={e=>toggle("Speak")}/>
                    <PressableIcon name="grading"  style={{backgroundColor:"skyblue"}}
                        onPress={e=>toggle("Grammar")}/>
                </View>
                {super.renderAt()}
            </>
        )
    }
}
