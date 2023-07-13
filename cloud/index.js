const { RedisPubSub }=require("graphql-redis-subscriptions")

let UUID=Math.floor(Date.now()/1000)
const Talk_Fields=`
            id:ID!,
            slug:String!,
            title: String!,
            duration: Int,
            description:String,
            speaker: String,
            thumb: String,
            tags: [String],
            video: URL,
            languages: JSON,
            source: String,
            data:[JSON],
            lang: String,
            mylang: String,
`
const Talk_Fields_Fragment=Talk_Fields.replace(/(\:.*\,)/g,"")

Cloud.addModule({
    name:"main",
    typeDefs:`
        type Anonymous{
            test:String
        }

        type Talk implements Node{
            ${Talk_Fields}
        }

        extend type User{
            isAdmin:Boolean
        }

        extend type Query{
            talk(slug:String, id:String):Talk
            talks(q:String, duration: Int):[Talk]
            people(q:String):[Talk]
            speakerTalks(speaker:String):[Talk]
            today:[Talk]
            widgetTalks(slug:String, q:String):[Talk]
            isAdmin:Boolean
            wechatBotBarcode(shortID:String!):String
        }

        extend type Mutation{
            save(talk:JSON!):Boolean
            remove(id:String!, type:String):Boolean
            wechatBotBarcode(url:String!, uuid:String!):String
            wechatBotBarcodeRemove(uuid:String!):Boolean
        }
    `, 
    resolver:{
        Anonymous:{

        },
        Talk:{
            id:({_id})=>_id,
        },
        Query:{
            async talk(_,{slug, id:_id},{app,user}){
                if(slug==="Widget"){
                    return app.get1Entity("Widget", {_id})
                }
                const filter={}
                if(slug){
                    filter.slug=slug
                }else if(_id){
                    filter._id=_id
                }
                return app.get1Entity("Talk", filter)
            },
            talks(_,{q, duration},{app}){
                const cond={$regex:q, $options:'i'}
                return app.findEntity("Talk", {$or:[{title:cond},{description:cond}]})
            },
            people(_,{q},{app}){
                return app.findEntity("Talk",{speaker:{$regex:q, $options:'i'}})
                    .then(talks=>Array.from(new Set(talks.map(a=>a.speaker))).map(a=>({speaker:a})))
            },
            speakerTalks(_,{q:speaker},{app}){
                return app.findEntity("Talk",{speaker})
            },
            today(_,{},{app}){
                return app.findEntity("Talk")
            },
            widgetTalks(_,{slug,q},{app}){
                if(!slug)
                    return app.findEntity("Widget")

                const props={slug}
                if(q){
                    props.title={$regex:q, $options:"i"}
                }
                return app.findEntity("Widget", props)
            },
            isAdmin(_,{},{app,user}){
                return app.get1Entity("User",{_id:user._id}).then(user=>user.isAdmin)
            },
            async wechatBotBarcode(_, {shortID}, {app}){
                const Type="WechatBotBarcode"
                const barcode=await app.get1Entity(Type, {shortID})
                return barcode?.url
            }
        },
        Mutation:{
            async save(_,{talk},{app}){
                const Type=talk.isWidget ? "Widget" : "Talk"
                const query={_id:talk._id}
                const old=await app.get1Entity(Type, query)
                if(old){
                    return app.updateEntity(Type, query, talk)
                        .then(talk=>true)
                        .catch(e=>false)
                }
                return app.createEntity(Type,talk)
                    .then(talk=>true)
                    .catch(e=>false)
            },
            remove(_,{id, type="Talk"},{app}){
                return app.remove1Entity(type, {_id:id})
            },
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
        },
    },
    persistedQuery:{ 
        save:`mutation save_Mutation($talk:JSON!){
            save(talk: $talk)
        }`,
        talk:`query talk_Query($slug:String, $id: String){
            talk(slug:$slug, id:$id){
                ${Talk_Fields_Fragment}
            }
        }`,
        talks:`query talks_Query($q:String!){
            talks(q:$q){
                ${Talk_Fields_Fragment}
            }
        }`,
        people:`query people_Query($q:String!){
            people(q:$q){
                name:speaker
            }
        }`,
        speakerTalks:`query speakerTalks_Query($q:String!){
            talks:speakerTalks(q:$q){
                ${Talk_Fields_Fragment}
            }
        }`,
        today:`query{
            talks:today{
                ${Talk_Fields_Fragment}
            }
        }`,
        widgetTalks:`query talks_Query($slug:String, $q:String){
            talks:widgetTalks(slug:$slug, q:$q){
                id
                title
                slug
            }
        }`,
        remove:`mutation remove_Mutation($id:String!, $type:String){
            remove(id:$id, type:$type)
        }`
    },
    indexes:{
        Talk:[{speaker:1}, {title:1, lang:1, mylang:1}, {slug:1}],
        Widget:[{title:1, slug:1, lang:1, mylang:1}],
        WechatBotBarcode:[{shortID:1}]
    },
    /*
    proxy:{
        chatgpt:{
            prependPath:false,
            secure:false,
            cookiePathRewrite:{
                "*":"/"
            },
            cookieDomainRewrite:{
                "*":"chat.openai.com"
            },
            target:"https://chat.openai.com"
        }
    }
    */
})

Cloud.addModule(require("react-native-use-qili/cloud/web-proxy")(
    /*
    new RedisPubSub({
        connection: {
            host:"qili.pubsub",
        }
    })
    */
))

//`https://cdn.qili2.com/${app.apiKey}/${updates}/${runtimeVersion}/${platform}-manifest.json`
Cloud.addModule(require("react-native-use-qili/cloud/expo-updates")())

Cloud.addModule({
    ...require("react-native-use-qili/cloud/expo-updates")("/wechat-bot/updates"),
    name:"wechat-bot-expo-updates",
})

/*
Cloud.addModule(require("react-native-use-qili/cloud/iap-validate")({
    path:"/verifyReceipt",
    callbackURL:"",
    password:""
}))

Cloud.addModule({
    ...require("react-native-use-qili/cloud/iap-validate")({
        path:"/wechat-bot/verifyReceipt",
        callbackURL:"",
        password:""
    }),
    name:"wechat-bot-iap",
})
*/

Cloud.addModule({
    name:"wechat-bot support",
    static(service){
        service
            .on('/wechat-bot/b',async (req, res)=>{
                const shortID=req.url.split("/").filter(a=>!!a).pop()
                const url=await req.app.resolver.Query.wechatBotBarcode({},{shortID},{app:req.app})
                res.reply(require("./www/wechat-bot/barcode-template.html").toString('utf8').replace("about:blank",url||""))
            })  
    }
})