import React from "react"
import { View } from "react-native"
import AudioBook from "./audiobook"
import WordBook from "./wordbook"
import { Media, Widget } from "../components"
import Player from "../player"

export default (props)=>{
    const itemLayout={
        width: "50%",
        height: 200,
        flex: 1,
        padding:5,
    }
    const itemStyle={
        backgroundColor: "rgba(249, 180, 45, 0.25)",
        borderWidth: 1.5,
        borderColor: "#fff",
        borderRadius:5
    }
    const widgets=[
        <AudioBook/>,
        <WordBook/>,
        <NumberPractice/>,
        <SpellNamePractice/>,
    ]
    return (
        <View {...props} style={{
            flexDirection:"row", flexWrap:"wrap", flex:1,
            alignContent: 'flex-start',alignItems: 'flex-start',
            }}>
                {widgets.map((widget,i)=>(
                    <Widget key={i} style={{itemLayout}}>
                        <View style={{itemStyle}}>
                            <Player media={widget}/>
                        </View>
                    </Widget>
                ))}
        </View>
    )
}

class NumberPractice extends Media{
    static createTranscript(){
        return []
    }

    componentDidUpdate(lastProps){
        if(lastProps.source!=this.props.source){
            const [min=0,max=10000000,amount=20]=source.split(",")
            this.setState({min, max, amount})
        }
    }

    getDurationMillis(){
        const {amount, max}=this.state
        return String(max).length*500*amount
    }

    playAt(positionMillis){
        const i=Math.floor(positionMillis/500)
        const n=this.getNumber(i)
        this.speak(n)
    }
}

class SpellNamePractice extends Media{

}