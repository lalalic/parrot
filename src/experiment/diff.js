import React from 'react';
import { Text } from "react-native";
import * as Diff from "diff";
import memoize from "memoize-one"

function trim(text){
    text=text.replace(/\n/g, " ")
    
    text=text.replace(/(\(.*\))/g, "")

    return text.replace(/\s+/g, " ").toLowerCase().trim()
}

export function diffScore(text, recognized, data) {
    text = trim(text)
    if(!text)
        return 110
    if(!recognized)
        return 10

    const [diffs, score]=(lang=>{
        const opt={ignoreCase:true}
        
        if(['zh','jp','kr'].find(a=>lang.indexOf(a)!=-1)){
            const diffs=Diff.diffChars(text, recognized, opt)
            return [
                diffs,
                Math.ceil(100 * 
                    text.length /
                        diffs.reduce((score, { count=0 }) => score + count, 0)
                )
            ]
        }else{
            const diffs=Diff.diffWords(text, recognized,opt)
            return [
                diffs,
                Math.ceil(100 *
                    text.split(/\s+/).length /
                        diffs.reduce((score, { value , count=0 }) => score + (count ? value.split(/\s+/).length : 0), 0)
                )
            ]
        }
    })(data?.lang||'en')
    
    if(data){
        data.diffs=diffs
        data.score=score
    }
    
    return score
}

export const diffPretty=memoize(function(diffs){
    if(!diffs || diffs.length==0)
        return ""    
    return diffs.map(({ removed, added, value:text }, i) => {
        return [
            (!!text && !removed && !added && <Text>{text}</Text>),
            (!!added && <Text style={{ color: "red" }}>{text}</Text>),
            (!!removed && <Text style={{ color: "red", textDecorationLine:"line-through" }}>{text}</Text>),
        ].filter(a=>!!a)
    }).flat().map((a,i)=>React.cloneElement(a,{key:i}))
})
