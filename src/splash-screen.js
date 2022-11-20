import React from "react"
import { AppOpenAd, TestIds, AdEventType } from 'react-native-google-mobile-ads';

export default ()=>{
    React.useEffect(()=>{
        const adUnitId = __DEV__ ? TestIds.APP_OPEN : 'ca-app-pub-4303160366764980/7396299432';
        const appOpenAd = AppOpenAd.createForAdRequest(adUnitId, {
            requestNonPersonalizedAdsOnly: true,
            keywords: ['fashion', 'clothing'],
        })
        const unsubscribe=appOpenAd.addAdEventListener(AdEventType.LOADED,()=>{
            appOpenAd.show()
            setTimeout(()=>{

            }, 4000)
        })

        appOpenAd.load()
        return ()=>unsubscribe()
        
    },[])

    return null
}