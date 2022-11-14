import React from "react"
import { FlatList, View, Text } from "react-native"
import { TalkThumb } from "../components"
import { ColorScheme } from "../default-style"
import NumberPractice, {PhoneNumber} from "./number"
import AudioBook from "./audio-book"
import PictureBook from "./picture-book"

export default (props)=>{
    const color=React.useContext(ColorScheme)
    const thumbStyle={backgroundColor:color.backgroundColor,borderColor:color.unactive}
    const imageStyle={height:180}
    const durationStyle={bottom:40,top:undefined}
    const titleStyle={height:40}
    return (
        <View {...props} style={{marginTop:20}}>
            <Text style={[{fontSize:20,backgroundColor:color.inactive, paddingLeft:5, overflow:"hidden",paddingLeft:10,
                    backgroundColor:color.inactive, borderRadius:5,borderWidth:1,height:50,lineHeight:50},]}>
                <Text>Widgets </Text> 
                <Text style={{fontSize:12}}>help practice particular things</Text>
            </Text>
            <FlatList
                data={Object.values(Widgets)}
                renderItem={({item,index})=><TalkThumb item={item.defaultProps} {...{thumbStyle, imageStyle,durationStyle,titleStyle}}/>}
                keyExtractor={item=>item.defaultProps.slug}
                horizontal={true}
                />
        </View>
    )
}

const Widgets=globalThis.Widgets=[
    NumberPractice, 
    //PhoneNumber, 
    AudioBook,
    PictureBook,
].reduce(((widgets,A)=>{
    widgets[A.defaultProps.slug]=A
    return widgets
}),{})
