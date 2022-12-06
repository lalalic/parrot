import React from "react"
import { useWindowDimensions } from "react-native"
import WebView from "react-native-webview"
import { useSelector } from "react-redux"

export default function Pronounciation(props){
    const lang=useSelector(state=>state.my.lang)
    const {width} = useWindowDimensions()
    return (
        <WebView style={{flex:1}}
            originWhitelist={['*']} 
            headers={{Cookie:""}}
            source={{html:`
            <style>
                body{width:100%; margin: 0 !important; }
            </style>
            <a id="yg-widget-0" class="youglish-widget" data-query="Great%20Power" data-lang="${Langs[lang]}"  
            data-zones="us" data-components="89" data-bkg-color="theme_light" 
            data-rest-mode="1" 
            data-video-quality="small"  
            rel="nofollow" href="https://youglish.com">Visit YouGlish.com</a>
            <script async src="https://youglish.com/public/emb/widget.js" charset="utf-8"></script>`}}
            {...props}
            />
    )
}

const Langs={
    en:"english",
}