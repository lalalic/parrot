import React from 'react';
import { Text } from "react-native";

import WordDiff from "word-diff";

const trim=text=>text.replace(/\n/, " ")
    .replace(/(\(.*\))|([^\w\s\n\'])/g, (a, $0, $1, i, src) => $1 == "." && /[0-9]/.test(src[i + 1]) ? $1 : "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim()

export function diffScore(text, recognized, data) {
    text = trim(text)
    if(!text)
        return 100
    if(!recognized)
        return 10
    const diffs = WordDiff.diffString(text, recognized.toLowerCase());
    const correctWords = diffs.reduce((score, { text }) => score + (text?.trim().split(" ").length ?? 0), 0)
    if(data){
        data.diffs=diffs
    }
    return Math.ceil(100 * correctWords / text.split(/\s+/).length);
}
export function diffPretty(text, recognized) {
    const data={}
    const score=diffScore(text, recognized, data)
    if(score==100){
        return [
            text.replace(/\n/, " "), 
            <Text style={{ width:"100%", color:"green"}}>Perfect Passed</Text>
        ]
    }
    
    if(!recognized){
        return [text.replace(/\n/, " "), ]
    }

    const diffs=data.diffs
    
    return [
        diffs.map(({ remove, add, text }, i) => {
            return (!!text && <Text key={i}>{text}</Text>)
                || (!!remove && <Text key={i} style={{ color: "yellow" }}>{remove}</Text>);
        }),
        diffs.map(({ remove, add, text }, i) => {
            return (!!text && <Text key={i}>{text}</Text>)
                || (!!add && <Text key={i} style={{ color: "red" }}>{add}</Text>)
                || (!!remove && !add && <Text key={i} style={{ color: "red", textDecorationLine:"line-through" }}>{remove}</Text>)
        })
    ];
}
