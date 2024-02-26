import React from "react"
import { FlatList, View, Text, useWindowDimensions } from "react-native"
import { TalkThumb } from "../components"
import { ColorScheme } from "react-native-use-qili/components/default-style"
import AudioBook from "./audio-book"
import PictureBook from "./picture-book"
import Chat from "./chat"
import DialogBook from "./dialog-book"
import VocabularyBook from "./vocabulary-book"
import YouTubeVideo from "./youtube-video"
import TedTalk from "./ted-talk"
const l10n=globalThis.l10n

/**
 * what is widget media?
 * what is widget talk?
 * {id, slug:widgetName, title, description, tag, transcript}
 */
export default ({horizontal=true,...props})=>{
    const color=React.useContext(ColorScheme)
    const thumbStyle={backgroundColor:color.backgroundColor,borderColor:color.unactive}
    const imageStyle={height:180}
    const durationStyle={bottom:40,top:undefined}
    const titleStyle={height:40}
    const widgets=React.useMemo(()=>Object.values(Widgets).filter(a=>!!a.defaultProps?.thumb))
    return (
        <View {...props} style={{marginTop:20}}>
            <Text style={[{fontSize:20,backgroundColor:color.inactive, paddingLeft:5, overflow:"hidden",paddingLeft:10,
                    backgroundColor:color.inactive, borderRadius:5,borderWidth:1,height:50,lineHeight:50},]}>
                <Text>{l10n["Widgets"]} </Text> 
                <Text style={{fontSize:12}}>{l10n["Help practice particular language skills"]}</Text>
            </Text>
            <FlatList
                data={widgets}
                renderItem={({item:Widget,index})=>(
                    <TalkThumb item={Widget.defaultProps} 
                        getLinkUri={({slug})=>`/widget/${slug}`}
                        {...{thumbStyle, imageStyle,durationStyle,titleStyle}}>
                    </TalkThumb>
                )}
                keyExtractor={item=>item.defaultProps.slug}
                horizontal={horizontal}
                />
        </View>
    )
}

export const Widgets=globalThis.Widgets=[
    VocabularyBook,
    DialogBook,
    PictureBook,
    AudioBook,
    Chat,
    
    YouTubeVideo, 
].reduce(((widgets,A)=>{
    widgets[A.defaultProps.slug]=A
    return widgets
}),{})

globalThis.TedTalk=TedTalk
