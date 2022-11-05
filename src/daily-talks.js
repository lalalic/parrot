import React, { useEffect } from "react"
import {StyleSheet, Text, FlatList, View, Image, Pressable } from 'react-native';
import {Link} from "react-router-native"
import {XMLParser} from 'fast-xml-parser'
import { ColorScheme, TalkStyle } from "./default-style";

export default ()=>{
    const [talks, setTalks] = React.useState({})
	useEffect(()=>{
        async function fetchTalsk(){
            const rss="http://feeds.feedburner.com/TEDTalks_audio"
            const res=await fetch(rss)
            const data=await res.text()
            const talks=new XMLParser({
                ignoreAttributes:false,
                attributeNamePrefix:"",
                removeNSPrefix:true,
                textNodeName:"value",
            }).parse(data);
            setTalks(talks)
        }
        fetchTalsk()
    },[])
	
    return (
        <View style={{flex:1}}>
            <Text style={{fontSize:20}}>{talks.rss?.channel.title}</Text>
            <FlatList
                data={talks.rss?.channel.item}
                renderItem={props=><TalkThumb {...props}/>}
                keyExtractor={item=>item.talkId}
                horizontal={true}
                />
        </View>
    )
}

function TalkThumb({item:{thumbnail,duration,title,link}}){
	const color=React.useContext(ColorScheme)
    const slug=(i=link.lastIndexOf("/"),j=link.indexOf("?"))=>link.substring(i+1,j)
	return (
		<Pressable style={[TalkStyle.thumb,{backgroundColor:color.backgroundColor,borderColor:color.unactive}]}>
            <Link to={`/talk/${slug()}`}>
			    <Image style={TalkStyle.image} source={{uri:thumbnail.url}}/>
            </Link>
			<Text  style={TalkStyle.duration}>{duration.replace(/00\:0?/,"")}</Text>
			<Text  style={TalkStyle.title}>{title}</Text>
		</Pressable>
	)
}