import React from "react"
import { AppOpenAd,BannerAd, BannerAdSize, TestIds, AdEventType, useInterstitialAd } from 'react-native-google-mobile-ads';

export function Splash({children, adUnitId=__DEV__ ? TestIds.APP_OPEN : 'ca-app-pub-4303160366764980/7396299432'}){
    React.useEffect(()=>{
        const appOpenAd = AppOpenAd.createForAdRequest(adUnitId, {
            requestNonPersonalizedAdsOnly: true,
            keywords: ['English', 'Education', 'Speaking'],
        })
        const unsubscribe=appOpenAd.addAdEventListener(AdEventType.LOADED,()=>{
            appOpenAd.show()
        })

        appOpenAd.load()
        return ()=>unsubscribe()
    },[])

    return children
}

export function Banner({adUnitId=__DEV__ ? TestIds.Banner : `ca-app-pub-4303160366764980/8471430153`}){
    return <BannerAd 
        unitId={adUnitId} 
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
            requestNonPersonalizedAdsOnly: true,
        }}
        />
}