import React from "react"
import { FlatList, View, Text } from "react-native"
import { TalkThumb } from "../components"
import { ColorScheme } from "../components/default-style"
import AudioBook from "./audio-book"
import PictureBook from "./picture-book"
import Chat from "./chat"
import DialogBook from "./dialog-book"
import VocabularyBook from "./vocabulary-book"
import YouTubeVideo from "./youtube-video"
import { useSelector } from "react-redux"
import TedTalk from "./ted-talk"

/**
 * what is widget media?
 * what is widget talk?
 * {id, slug:widgetName, title, description, tag, languages:{mine:{transcript}}}
 */
export default (props)=>{
    const color=React.useContext(ColorScheme)
    const thumbStyle={backgroundColor:color.backgroundColor,borderColor:color.unactive}
    const imageStyle={height:180}
    const durationStyle={bottom:40,top:undefined}
    const titleStyle={height:40}
    const {widgets={}}=useSelector(state=>state.my)
    return (
        <View {...props} style={{marginTop:20}}>
            <Text style={[{fontSize:20,backgroundColor:color.inactive, paddingLeft:5, overflow:"hidden",paddingLeft:10,
                    backgroundColor:color.inactive, borderRadius:5,borderWidth:1,height:50,lineHeight:50},]}>
                <Text>Widgets </Text> 
                <Text style={{fontSize:12}}>help practice particular things</Text>
            </Text>
            <FlatList
                data={Object.values(Widgets).filter(a=>widgets[a.defaultProps.slug]!==false)}
                renderItem={({item:Widget,index})=>(
                    <TalkThumb item={Widget.defaultProps} 
                        getLinkUri={({slug})=>`/widget/${slug}`}
                        {...{thumbStyle, imageStyle,durationStyle,titleStyle}}>
                    </TalkThumb>
                )}
                keyExtractor={item=>item.defaultProps.slug}
                horizontal={true}
                />
        </View>
    )
}

export const Widgets=globalThis.Widgets=[
    Chat,
    DialogBook,
    PictureBook,
    AudioBook,
    VocabularyBook,
    YouTubeVideo, 
].reduce(((widgets,A)=>{
    widgets[A.defaultProps.slug]=A
    return widgets
}),{})

globalThis.TedTalk=TedTalk
