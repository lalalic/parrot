import React from 'react';
import { Text } from "react-native";
import WordDiff from "word-diff";

export function diffScore(text, recognized) {
    text = text.replace(/(\(.*\))|([^\w\s\n])/g, (a, $0, $1, i, src) => $1 == "." && /[0-9]/.test(src[i + 1]) ? $1 : "")
        .replace(/\s+/g, " ")
        .toLowerCase();
    const diffs = WordDiff.diffString(text, recognized.toLowerCase());
    const correctWords = diffs.reduce((score, { text }) => score + (text?.trim().split(" ").length ?? 0), 0);
    return Math.ceil(100 * correctWords / text.split(/\s+/).length);
}
export function diffPretty(text, recognized) {
    const source = text.replace(/\n/, " ");
    if (!recognized) {
        return [source, recognized];
    }

    const diffs = WordDiff.diffString(
        source.replace(/(\(.*\))|([^\w\s\n])/g, (a, $0, $1, i, src) => $1 == "." && /[0-9]/.test(src[i + 1]) ? $1 : "").replace(/\s+/g, " ").toLowerCase(),
        recognized.toLowerCase()
    );
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
