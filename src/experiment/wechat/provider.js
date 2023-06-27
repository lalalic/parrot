import React, { useRef } from "react";
import { Platform, View, Image, Text, Pressable } from "react-native";
import { WebView } from "react-native-webview";
import { Loading, useStateAndLatest } from "../../components";
import { Buffer } from "buffer";
import WechatBro from "./bro.js";
import { useAutobot, WeChatContext } from "./use-wechat";
import { useDispatch, useSelector } from "react-redux";
import { useKeepAwake } from "expo-keep-awake";

export default function WeChatProvider({ uri = "https://wx.qq.com", children, debug:initDebug}) {
    useKeepAwake()
    const me=useSelector(state=>state.wechat.me)
    const webViewRef = useRef(null)
    const dispatch=useDispatch()
    const [debug, setDebug, $debug]=useStateAndLatest(!!initDebug)
    
    const userAgent = React.useMemo(() => Platform.select({
        ios: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36",
        android: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36",
        web: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36",
    }), []);

    const injectWechatBro = React.useMemo(() => {
        return `
            window.wechatyPuppetBridgeEmit=(event, data)=>window.ReactNativeWebView.postMessage(JSON.stringify({event,data}));
            ${WechatBro.toString().replace(/^function\s+injectWechat\(\s*\)\s*\{/, "").replace(/\}$/g, "")};
            true;
        `;
    }, []);

    const [wechat, resolveFnCallResult] = React.useMemo(() => {
        let uuid = 0;
        const resultPs = {}
        const events = {
            on(type, fn) {
                (events[type] = events[type] || []).push(fn);
            },
            fire(type, data) {
                console.debug({event:type, data});
                (events[type] || []).forEach(fn => fn(data));
            }
        }
        const fx=fnKey=>(...args)=>{
            if (!webViewRef.current) {
                throw new Error("wechat context is not ready yet");
            }
            const eventId = `${uuid++}`;
            const argsEncoded = Buffer.from(encodeURIComponent(JSON.stringify(args))).toString('base64');
            // see: http://blog.sqrtthree.com/2015/08/29/utf8-to-b64/
            const argsDecoded = `JSON.parse(decodeURIComponent(window.atob('${argsEncoded}')))`;
            const script = `(async ()=>{
                    const result=await Promise.resolve(WechatyBro.${fnKey}(...${argsDecoded}));
                    WechatyBro.emit(
                        'fnCall', 
                        {
                            id: '${eventId}',
                            result: result
                        }
                    )
                })();
                true;`.replace(/[\n\s]+/, ' ');
            const resultP = (p => Object.assign(new Promise((resolve, reject) => Object.assign(p, { resolve, reject })), p))({});
            resultPs[eventId] = resultP;
            webViewRef.current.injectJavaScript(script);
            return resultP;
        }

        const extendFx={
            async getAllContacts(){
                return Object.values(await wechat["glue.contactFactory.getAllContacts"]())
            },
            async getContent(id){
                return await wechat["glue.contactFactory.getContact"](id)
            }
        }

        const proxy=new Proxy(extendFx, {
            get(o, fnKey) {
                return o[fnKey]||events[fnKey]||fx(fnKey)
            },
            ownKeys(){
                return []
            }
        })

        return [
            proxy,
            ({ id, result }) => {
                try{
                    const p = resultPs[id];
                    delete resultPs[id];
                    p.resolve(result);
                }catch(e){
                    console.error(e)
                }
            },
            events
        ];
    }, [])
    const autobot = useAutobot(wechat)

    const errorRef=React.useRef()
    const [status, setStatus, $status] = useStateAndLatest("loading");
    const [barcode, setBarcode] = React.useState()
    
    const switchAccount=React.useCallback(()=>{
        let count=0
        return ()=>{
            if(count>5){
                console.debug('try switchAccount 5 times, there must be something wrong.')
                return 
            }
            webViewRef.current?.injectJavaScript(`
                ;(function(){
                    let button=document.querySelector("div.association.show > a[ng-click='qrcodeLogin()']");
                    if(button){
                        button.click()
                    };
                    return true;
                })();
            `)
            console.debug('try switchAccount '+count++)
        }
    },[])();

    const onMessage = React.useCallback(({ nativeEvent }) => {
        const { event, data } = JSON.parse(nativeEvent.data);
        switch (event) {
            case "fnCall":
                return resolveFnCallResult(data);
            case "log":
                if(data.startsWith("checkScan() code:0") || data.startsWith("checkScan() code:NaN")){
                    switchAccount()
                }
                return console.debug(data);
            case "scan":
                setBarcode(data.url);
                setStatus("scan");
                break;
            case "login":
                setBarcode("")
                setStatus("loginInited")
                console.debug({event,data})
                return
            case "pageInited":{
                
                console.debug({event,data})
                return
            }
            case "logout":
                setStatus("logout");
                break;
            case "message":
                autobot?.(data);
                break;
            case "addContacts":{
                if(data>0 && $status.current!="login"){
                    (async function uniqueAccountCheck(){
                        const id=await wechat["glue.accountFactory.getUin"]()
                        if(me && id!=me){
                            if(!$debug.current){
                                await wechat.logout()
                                errorRef.current="Each device can only support one wechat account."
                                console.error(`current ${id} != last ${me}`)
                                setStatus("error")
                                return false
                            }
                        }

                        dispatch({type:"wechat/set", payload:{me:id, loginAt:Math.ceil(Date.now()/1000)}})
                        setStatus('login')
                    })();
                }   
                break
            }
            default:
                return;
        }
        wechat.fire(event, data);
    }, [resolveFnCallResult, me, autobot])


    const webviewProps=React.useMemo(()=>{
        return !debug ? {
                pointerEvents:"none",
                style:{ position: "absolute", width: "100%", height: 0, top: 0, left: 0 }
            }: {style:{width: "100%", flex:1}}
    },[debug])

    const content=React.useMemo(()=>{
        if(status=="error"){
            return (
                <View style={{flex:1, justifyContent:"center"}}>
                    <Text style={{color:"red"}}>{errorRef.current}</Text>
                </View>
            )
        }
        return (
            status == "scan" && (
                <View style={{ flex: 1, height: "100%", alignItems: "center", justifyContent: "center" }}>
                    <Pressable onLongPress={e=>setDebug(!debug)}>
                        <Text style={{marginBottom:20, color:"white"}}>用微信扫描二维码登录</Text>
                    </Pressable>
                    <Image source={{ uri: barcode }} style={{ width: 200, height: 200 }} />
                </View>
            ) || (status == "login" ? children : <Loading onLongPress={e=>setDebug(!debug)}/>)
        )
    },[status, barcode, children])

    React.useEffect(()=>{
        if(status=="error"){
            setTimeout(()=>{
                setStatus("loading")
            },5000)
        }
    },[status])
    return (
        <WeChatContext.Provider value={{ wechat, status }}>
            <View {...webviewProps}>
                <WebView
                    ref={webViewRef}
                    style={{ flex: 1 }}
                    source={{ uri }}
                    sharedCookiesEnabled={false}
                    userAgent={userAgent}
                    injectedJavaScriptBeforeContentLoaded={injectWechatBro}
                    injectedJavaScript={`
                        ;(async()=>{
                            await new Promise((resolve)=>{
                                const timer=setInterval(()=>{
                                    if(window.WechatyBro.angularIsReady()){
                                        clearInterval(timer)
                                        resolve(true)
                                    }
                                },1000)
                            })
                            WechatyBro.init();

                            const {contactFactory, chatFactory, rootScope, appScope}=WechatyBro.glue

                            rootScope.$on("root:pageInit:success",()=>WechatyBro.emit("pageInited"));
                            appScope.$on("newLoginPage",()=>WechatyBro.emit("pageInited"))

                            function toContactJSON(){
                                const {PYQuanPin:id, HeadImgUrl:thumb, StarFriend:starred, NickName, RemarkName, name=RemarkName||NickName}=this
                                const obj={id,name,thumb,starred}
                                
                                for (const [key, value] of Object.entries(this)) {
                                    if(typeof(key)=="string" && 
                                        key[0]=='i' && key[1]=='s' && 
                                        typeof(value)=="function"){
                                            try{
                                                obj[key]=this[key]()
                                            }catch(e){

                                            }
                                    }
                                }
                                return obj
                            }
                            function toMessageJSON(){
                                const {FromUserName, ToUserName, Content, CreateTime, MsgId:id, MsgType:type}=this
                                const obj={
                                    id,type,
                                    from:contactFactory.getContact(FromUserName),
                                    to:contactFactory.getContact(ToUserName),
                                    content:Content,
                                    createdAt:CreateTime
                                }
                                return obj
                            }

                            contactFactory.addContact=(_addContact=>function(contact){
                                contact.toJSON=toContactJSON
                                _addContact.call(this, ...arguments)
                            })(contactFactory.addContact);

                            contactFactory.addContacts=(_addContacts=>{
                                const existing=Object.values(contactFactory.getAllContacts())
                                existing.forEach(a=>a.toJSON=toContactJSON);
                                
                                return function(contacts){
                                    _addContacts.call(this, ...arguments)
                                    WechatyBro.emit("addContacts",contacts.length)
                                }
                            })(contactFactory.addContacts);

                            chatFactory.addChatMessage=(_addChatMessage=>function(message){
                                message.toJSON=toMessageJSON
                                _addChatMessage.call(this,...arguments)
                            })(chatFactory.addChatMessage);

                            function imgToDataURI(image){
                                const canvas = document.createElement('canvas')
                                const context = canvas.getContext('2d')
                                canvas.width = image.naturalWidth;
                                canvas.height = image.naturalHeight;
                                context.drawImage(image, 0, 0)
                                return canvas.toDataURL()
                            }
                            WechatyBro.toThumbURI=(thumb)=>{
                                return new Promise((resolve)=>{
                                    let image=document.querySelector('img[src="'+thumb+'"]')
                                    if(image){
                                        if(image.complete){
                                            resolve(imgToDataURI(image))
                                            return 
                                        }
                                    }else{
                                        image = document.createElement('img');
                                        image.setAttribute("mm-src",image.src = thumb)
                                    }
                                    
                                    image.addEventListener('load', ()=>resolve(imgToDataURI(image)))
                                    image.addEventListener("error", e=>resolve())
                                    
                                    document.body.appendChild(image)
                                })
                            }
                        })();  
                    `}
                    onMessage={onMessage} />
            </View>
            {content}
        </WeChatContext.Provider>
    )
}

