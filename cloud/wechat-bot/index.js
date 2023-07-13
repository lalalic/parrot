
let UUID=Math.floor(Date.now()/1000)
Cloud.addModule({
    name:"wechat-bot support",
    typeDefs:`
        extend type Query{
            wechatBotBarcode(shortID:String!):String
        }

        extend type Mutation{
            wechatBotBarcode(url:String!, uuid:String!):String
            wechatBotBarcodeRemove(uuid:String!):Boolean
        }
    `,
    resolver:{
        Query:{
            async wechatBotBarcode(_, {shortID}, {app}){
                const Type="WechatBotBarcode"
                const barcode=await app.get1Entity(Type, {shortID})
                return barcode?.url
            }
        },
        Mutation:{
            async wechatBotBarcode(_, {url,uuid:_id}, {app}){
                const Type="WechatBotBarcode"
                const old=await app.get1Entity(Type,{_id})
                if(old){
                    app.updateEntity(Type, {_id}, {$set:{url}})
                    return old.shortID
                }else{
                    const shortID=(UUID++).toString(36)
                    app.createEntity(Type, {_id, shortID, url})
                    return shortID
                }
            },
            async wechatBotBarcodeRemove(_, {uuid:_id}, {app}){
                app.remove1Entity("WechatBotBarcode",{_id})
                return true
            }
        }
    },
    static(service){
        service
            .on('/wechat-bot/b',async (req, res)=>{
                const shortID=req.url.split("/").filter(a=>!!a).pop()
                const url=await req.app.resolver.Query.wechatBotBarcode({},{shortID},{app:req.app})
                res.reply(require("./www/wechat-bot/barcode-template.html").toString('utf8').replace("about:blank",url||""))
            })  
    }
})


Cloud.addModule({
    ...require("react-native-use-qili/cloud/expo-updates")("/wechat-bot/updates"),
    name:"wechat-bot-expo-updates",
})

Cloud.addModule({
    ...require("react-native-use-qili/cloud/iap-validate")({
        path:"/wechat-bot/verifyReceipt",
        callbackURL:"",
        password:""
    }),
    name:"wechat-bot-iap",
})