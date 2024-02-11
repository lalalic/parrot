import React from 'react';
import { Text } from "react-native";
import * as Diff from "diff";
import memoize from "memoize-one"

const SE=/[^\p{L}\p{N}]+/gu

export function diffScore(text, recognized, data) {
    text = (text||"").split(SE).filter(a=>!!a)
    recognized = (recognized||"").split(SE).filter(a=>!!a)
    if(!text.length)
        return 110
    if(!recognized.length)
        return 10

    const [diffs, score]=(lang=>{
        const opt={ignoreCase:true}
        
        if(['zh','jp','kr'].find(a=>lang.indexOf(a)!=-1)){
            text=text.join("")
            recognized=recognized.join("")
            const diffs=Diff.diffChars(text, recognized, opt)
            const total=text.length
            const valid=diffs.reduce((score, {count=0, added, removed }) => score + (!added && !removed && count || 0), 0)
            console.log({
                text, recognized,
                diffs, 
                total, valid
            })
            return [
                diffs,
                Math.ceil(100 * valid/total)
            ]
        }else{
            text=text.join(" ")
            recognized=recognized.join(" ")
            const diffs=Diff.diffWords(text, recognized,opt)
            const total=text.split(SE).length
            const valid=diffs.reduce((score, { value , count=0, added, removed }) => score + (!added && !removed && count ? value.split(SE).length : 0), 0)
            console.log({
                text, recognized,
                diffs, 
                total, valid
            })
            return [
                diffs,
                Math.ceil(100 * valid/total)
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
