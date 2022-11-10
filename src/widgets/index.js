import React from "react"
import { FlatList, View, Text } from "react-native"
import { TalkThumb } from "../components"
import { ColorScheme } from "../default-style"
import NumberPractice, {PhoneNumber} from "./number"
import SpellNamePractice from "./spell-name"
import AudioBook from "./audiobook"
import WordBook from "./wordbook"

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

const Widgets=globalThis.Widgets=[
    NumberPractice, PhoneNumber, 
    SpellNamePractice,
    AudioBook,
    WordBook,
].reduce(((widgets,A)=>{
    widgets[A.defaultProps.id]=A
    return widgets
}),{})
