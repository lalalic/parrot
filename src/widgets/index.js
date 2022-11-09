import React from "react"
import { FlatList, View, Text } from "react-native"
import { Media, TalkThumb } from "../components"
import { ColorScheme } from "../default-style"

export default (props)=>{
    const color=React.useContext(ColorScheme)
    return (
        <View {...props} style={{marginTop:20}}>
                <Text style={{fontSize:20,backgroundColor:color.inactive, paddingLeft:5}}>
                    <Text>Widgets </Text> 
                    <Text style={{fontSize:12}}>help practice particular things</Text>
                </Text>
                <FlatList
                    data={Object.values(Widgets)}
                    renderItem={({item,index})=><TalkThumb item={item.defaultProps}/>}
                    keyExtractor={item=>item.defaultProps.slug}
                    horizontal={true}
                    />
        </View>
    )
}

class NumberPractice extends Media{
    static defaultProps={
        ...Media.defaultProps,
        id:"number",
        slug:"number",
        title:"Practice Number Sensitivity",
        thumb:require("../../assets/favicon.png"),
        
    }

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
    static defaultProps={
        ...Media.defaultProps,
        id:"spellName",
        slug:"spellName",
        title:"Practice Spelling Name",
        thumb:require("../../assets/favicon.png"),
    }
}

const Widgets=globalThis.Widgets=[
    NumberPractice, 
    SpellNamePractice,
].reduce(((widgets,A)=>{
    widgets[A.defaultProps.id]=A
    return widgets
}),{})
