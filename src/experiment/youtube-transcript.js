import {XMLParser} from 'fast-xml-parser'

export class YoutubeTranscript {
    static async fetchTranscript(videoId,{lang="en"}){
        if(lang!=="en")
          return 
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
}