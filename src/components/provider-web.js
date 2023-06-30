import React, { useRef } from "react";
import { Platform, View } from "react-native";
import { WebView } from "react-native-webview";
import { useStateAndLatest } from ".";
import { Buffer } from "buffer";
import { useSelector } from "react-redux";
import { Qili } from "../store";

export default function WebviewServiceProvider({ id, uri, Context, children, bro, broName, debug: initDebug, ...props }) {
    const webviewRef = useRef(null);
    const banned=useSelector(state=>state.my.webviewservices[id]===false)
    const [debug, setDebug, $debug] = useStateAndLatest(!!initDebug);
    const [status, setStatus, $status] = useStateAndLatest("loading");

    const webviewProps = React.useMemo(() => {
        return !debug ? {
            pointerEvents: "none",
            style: { position: "absolute", width: "100%", height: 0, top: 0, left: 0 }
        } : { style: { width: "100%", flex: 1 } };
    }, [debug]);

    const userAgent = React.useMemo(() => Platform.select({
        ios: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36",
        android: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36",
        web: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36",
    }), []);

    const [service, injectBro] = React.useMemo(() => {
        broName = broName || `HelloMyBro`;
        let uuid = 0;
        const resultPs = {};
        const events = {
            on(type, fn) {
                (events[type] = events[type] || []).push(fn);
                return proxy;
            },
            fire(type, data) {
                console.debug({ event: type, data });
                (events[type] || []).forEach(fn => fn(data));
                return proxy;
            }
        };

        const fx = fnKey => (...args) => {
            console.debug({fnKey, args})
            if(banned){
                return new Promise((resolve, reject)=>{
                    const unsub=Qili.subscribe({
                        id:"askThenWaitAnswer",
                        query:`subscription a($message:JSON!){
                            askThenWaitAnswer(message:$message)
                        }`,
                        variables:{ message: {fnKey, args, $service: id} }
                    },({data,errors})=>{
                        unsub()
                        if(errors){
                            console.error(errors)
                            reject(onError(new Error("Your request can't be processed now.")))
                        }else{
                            resolve(data.askThenWaitAnswer)
                        }
                    })
                })
            }

            if (!webviewRef.current) {
                throw new Error("context is not ready yet");
            }
            const eventId = `${uuid++}`;
            const argsEncoded = Buffer.from(encodeURIComponent(JSON.stringify(args))).toString('base64');
            // see: http://blog.sqrtthree.com/2015/08/29/utf8-to-b64/
            const argsDecoded = `JSON.parse(decodeURIComponent(window.atob('${argsEncoded}')))`;
            const script = `(async ()=>{
                    const result=await Promise.resolve(${broName}.${fnKey}(...${argsDecoded}));
                    window.emit(
                        'fnCall', 
                        {
                            id: '${eventId}',
                            result: result,
                            callee: '${broName}.${fnKey}',
                        }
                    )
                })();
                true;`.replace(/[\n\s]+/, ' ');
            const resultP = (p => Object.assign(new Promise((resolve, reject) => Object.assign(p, { resolve, reject })), p))({});
            resultPs[eventId] = resultP;
            webviewRef.current.injectJavaScript(script);
            return resultP;
        };

        const extendFx = {
            status(v) {
                return typeof (v) != "undefined" ? setStatus(v) : $status.current;
            },
            debug(v) {
                return typeof (v) != "undefined" ? setDebug(!!v) : $debug.current;
            },
            webviewRef,
        };

        events.on("fnCall", ({ id, result }) => {
            try {
                const p = resultPs[id];
                delete resultPs[id];
                p.resolve(result);
            } catch (e) {
                console.error(e);
            }
        });

        const proxy = new Proxy(extendFx, {
            get(o, fnKey) {
                return o[fnKey] || events[fnKey] || fx(fnKey);
            }
        });

        const broCode = bro.toString();

        const injectBro = `
            window.emit=(event, data)=>window.ReactNativeWebView.postMessage(JSON.stringify({event,data}));
            
            window.imgToDataURI=(image)=>{
                const canvas = document.createElement('canvas')
                const context = canvas.getContext('2d')
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                context.drawImage(image, 0, 0)
                return canvas.toDataURL()
            };
            window.emit('emit.imgToDataURI');

            ;let $$bro$$=(${broCode})();
            if($$bro$$ && !('${broName}' in window)){
                window.${broName}=$$bro$$
            };
            window.emit('bro', !! window.${broName});
            true;
        `;


        return [proxy, injectBro];
    }, [banned]);

    const onMessage = React.useCallback(({ nativeEvent }) => {
        const { event, data } = JSON.parse(nativeEvent.data);
        service.fire(event, data);
    }, [service]);

    return (
        <Context.Provider value={{ service, status }}>
            {!banned && <View {...webviewProps}>
                <WebView
                    ref={webviewRef}
                    style={{ flex: 1 }}
                    source={{ uri }}
                    sharedCookiesEnabled={true}
                    userAgent={userAgent}
                    injectedJavaScriptBeforeContentLoaded={injectBro}
                    onMessage={onMessage}
                    {...props} />
            </View>}
            {children}
        </Context.Provider>
    );
}
