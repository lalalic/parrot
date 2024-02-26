import React from "react";
import * as Linking from "expo-linking";
import { useNavigate } from "react-router-native";
import { useStore } from "react-redux"

import * as FileSystem from "expo-file-system";
import ytdl from "react-native-ytdl";
import mpegKit from "../experiment/mpeg";
import FlyMessage from "react-native-use-qili/components/FlyMessage";
import {alert} from "react-native-use-qili/components/Prompt"

import {XMLParser} from 'fast-xml-parser'
const l10n=globalThis.l10n

export default function YoutubeShare() {
    const url=Linking.useURL()
    //const url = "parrot://share/?url=https://www.youtube.com/watch?v=gOqitVsRYRE";
    const navigate = useNavigate();
    const store=useStore()
    React.useEffect(() => {
        if (!url)
            return;
        const link = url.split("?url=")[1];
        const parsed = Linking.parse(decodeURIComponent(link));
        if (!["youtu.be", "www.youtube.com", "youtube.com"].includes(parsed.hostname))
            return;
        const videoId=parsed.queryParams.v || parsed.path;
        if (!videoId)
            return;
        
        fetchYoutubeTalk({id:videoId},store)
            .then(
                ()=>navigate(`/talk/youtube/general/${videoId}`),
                e=>FlyMessage.error(e.message)
            )
    }, [url]);
    return null;
}

export async function fetchYoutubeTalk({ id }, store) {
	const { my: { lang, mylang } } = store.getState();
	const talk={id}
	try {
		FlyMessage.show(`Download transcript...`);
		const transcripts = await fetchTranscript(id, { lang });

		if (transcripts) {
			transcripts.forEach(cue => {
				cue.time = cue.offset;
				delete cue.offset;
				cue.end = cue.time + cue.duration;
				delete cue.duration;
			});
		}else{
			throw new Error('No transcript')
		}
		talk.transcript=[{ cues: transcripts }]
	} catch (e) {
		const yes=await alert(`This video doesn't have transcript. Do you want to continue?`)
		if(!yes){
			return 
		}
	}

	FlyMessage.show("Getting video information...");
	const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${id}`);
	const format = (formats => {
		return ytdl.chooseFormat(formats, {
			filter: a => a.hasAudio && a.container == "mp4",
			quality: "lowestvideo",
		});
	})(info.formats);

	const { title, lengthSeconds, thumbnails: [{ url: thumb }] } = info.videoDetails;

	Object.assign(talk, {
		id, slug: `youtube`, title, thumb,
		video: format.url,
		duration: parseInt(lengthSeconds) * 1000,
	})

	store.dispatch({ type: "talk/set", talk });

	store.dispatch({
		type: "my/queue", task: function downloadYoutube(logFx){
			const file = talk.localVideo = `${FileSystem.documentDirectory}${id}/video.mp4`;
			function size(m){
				const size = !!logFx && !!m && m.match(/size=\s*(?<size>\d+)kB\s/)?.groups?.size
				return size ? `${size}${l10n['kb']}` : null
			}
			return mpegKit.generateAudio({ source: format.url, target: file }, message=>logFx?.(size(message)))
				.then(() => {
					store.dispatch({ type: "talk/set", talk: { id, localVideo: file } });
					FlyMessage.show(`Downloaded audio`);
				})
				.catch(e => {
					FlyMessage.error(`download video error, cancel it!`);
					store.dispatch({ type: "talk/clear", id });
				});
		}
	});

	return talk;
}

export async function fetchTranscript(videoId){
    const res=await fetch(`https://youtubetranscript.com/?server_vid2=${videoId}`)
    const text=await res.text()
    const {transcript}=new XMLParser({
        ignoreAttributes:false,
        attributeNamePrefix:"",
        removeNSPrefix:true,
        textNodeName:"value",
    }).parse(text)
    
    const cues=transcript.text.map(({start, dur, value,},i, data)=>{
        start=parseInt(parseFloat(start)*1000)
        const nextStart=data.length-1>i ? parseInt(parseFloat(data[i+1].start)*1000) : start+parseInt(parseFloat(dur)*1000)+100
        return {
            text:value, 
            offset: start, 
            duration: nextStart-start-100
        }
    })
    return cues
}

