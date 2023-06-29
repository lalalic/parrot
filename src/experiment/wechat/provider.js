import React from "react";
import { View, Image, Text, Pressable } from "react-native";
import { Loading } from "../../components";
import WechatyBro from "./bro.js";
import { useAutobot, WeChatContext } from "./use-wechat";
import { useStore } from "react-redux";
import { WebviewServiceProvider } from "../../components/provider-web";

export default function WechatProvider({children, ...props}){
    return (
        <WebviewServiceProvider 
            Context={WeChatContext}
            uri="https://wx.qq.com"
            bro={WechatyBro}
            broName="WechatyBro"
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
                        const {UserName, PYQuanPin:id, HeadImgUrl:thumb, StarFriend:starred, NickName, RemarkName, name=RemarkName||NickName}=this
                        const obj={id,name,thumb,starred, UserName}
                        
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
            {...props}
            >
            <Wechat children={children}/>
        </WebviewServiceProvider>
    )
}

function Wechat({children}){
    const store=useStore()
    const dispatch=store.dispatch
    const {status, service}=React.useContext(WeChatContext)
    console.log(`status = ${status} in Wechat`)
    const [barcode, setBarcode] = React.useState()
    const autobot = useAutobot(service)

    const switchAccount=React.useCallback(()=>{
        let count=0
        return ()=>{
            if(count>5){
                console.debug('try switchAccount 5 times, there must be something wrong.')
                return 
            }
            service.webviewRef.current?.injectJavaScript(`
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
    },[service])();
    
    const uniqueAccountCheck=React.useCallback(async()=>{
        const id=await service["glue.accountFactory.getUin"]()
        const {wechat:{me}}=store.getState()
        if(me && id!=me){
            if(!service.debug()){
                await service.logout()
                console.error(`current ${id} != last ${me}`)
                service.status("error")
                return false
            }
        }

        dispatch({type:"wechat/set", payload:{me:id, loginAt:Math.ceil(Date.now()/1000)}})
        service.status('login')
    },[service])


    React.useEffect(()=>{
        if(!service)
            return
        service
            .on('scan',data=>{
                service.status("scan")
                setBarcode(data.url)
            })
            .on('log',data=>{
                if(data.startsWith("checkScan() code:0") || 
                    data.startsWith("checkScan() code:NaN")){
                    switchAccount()
                }
                console.debug(data)
            })
            .on('addContacts', data=>{
                if(data>0 && service.status()!="login"){
                    uniqueAccountCheck()
                }
            })
            .on('message', data=>autobot?.(data))
            .on("login", data=>{
                setBarcode("")
                service.status("loginInited")
            })
            .on("logout", data=>service.status("logout"))
    },[service])

    React.useEffect(()=>{
        if(status=="error"){
            setTimeout(()=>{
                service.status("loading")
            },5000)
        }
    },[status, service])

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

    return (<>{content}</>)
}