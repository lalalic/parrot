import React, { useEffect } from "react"
import {StyleSheet, Text, FlatList, View, Image, Pressable } from 'react-native';
import {Link} from "react-router-native"
import {XMLParser} from 'fast-xml-parser'

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
        <View style={styles.talks}>
            <Text style={styles.talksTitle}>{talks.rss?.channel.title}</Text>
            <FlatList
                data={talks.rss?.channel.item}
                renderItem={talkThumb}
                keyExtractor={item=>item.talkId}
                horizontal={true}
                />
        </View>
    )
}

function talkThumb({item:{thumbnail,duration,title,link}}){
    const slug=(i=link.lastIndexOf("/"),j=link.indexOf("?"))=>link.substring(i+1,j)
    return (
		<Pressable style={styles.talkThumb}>
            <Link to={`/talk/${slug()}`}>
			    <Image style={styles.talkThumbImage} source={{uri:thumbnail.url}}/>
            </Link>
			<Text  style={styles.talkThumbDuration}>{duration.replace(/00\:0?/,"")}</Text>
			<Text  style={styles.talkThumbTitle}>{title}</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	talks:{
        flex:1,
	},
	talksTitle:{
		fontSize:20,
	},
	talkThumb:{
		margin:5,
		height: 220,
		width:240,
		borderWidth:4,
		borderColor:'transparent',
		borderRadius:10,
		backgroundColor:'black',
	},
	talkThumbImage:{
		width:"100%",
		height:180,
	},
	talkThumbDuration:{
		position:"absolute",
		bottom:60,
		right:5,
		color:"white"
	},
	talkThumbTitle:{
		position:"absolute",
		bottom:0,
		color:"white"
	}
});
