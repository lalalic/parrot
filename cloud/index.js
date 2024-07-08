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
            talks(q:String, duration: Int, lang:String):[Talk]
            people(q:String):[Talk]
            speakerTalks(speaker:String):[Talk]
            today:[Talk]
            widgetTalks(slug:String, q:String, lang:String):[Talk]
            isAdmin:Boolean
        }

        extend type Mutation{
            save(talk:JSON!):Boolean
            remove(id:String!, type:String):Boolean
            changeWidgetTalkTitle(id:String!, title:String!):Boolean
            crashReport(crash:JSON!):Boolean
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
            talks(_,{q, duration, lang="en"},{app}, other){
                const cond={$regex:q, $options:'i'}
                return app.findEntity("Talk", {$or:[{title:cond},{description:cond}], lang})
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
            widgetTalks(_,{slug,q, lang="en"},{app}){
                const props={lang}
                if(!slug)
                    return app.findEntity("Widget", props)

                props.slug=slug
                if(q){
                    props.title={$regex:q, $options:"i"}
                }
                return app.findEntity("Widget", props)
            },
            isAdmin(_,{},{app,user}){
                return app.get1Entity("User",{_id:user._id}).then(user=>!!user?.isAdmin)
            },
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
            crashReport(_,{crash:{message}},{}){
                console.error(`crash report: ${message}`)
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
        talks:`query talks_Query($q:String!, $lang:String){
            talks(q:$q, lang:$lang){
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
        widgetTalks:`query talks_Query($slug:String, $q:String, $lang:String){
            talks:widgetTalks(slug:$slug, q:$q, lang:$lang){
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
        Talk:[{speaker:1}, {title:1, lang:1, mylang:1}, {slug:1}, {lang:1}],
        Widget:[{title:1, slug:1, lang:1, mylang:1}, {lang:1}],
        WechatBotBarcode:[{shortID:1}]
    },
    static(service){
        service
            .on("/paymentLink", async(req, res)=>{
            const res1=await fetch("https://ai.qili2.com/paymentLink?prefilled_email=parrot@qili2.com",{
                headers:{
                    ["x-session-token"]:await req.app.resolver.User.token(req.user,{expiresIn:"2m"},req)
                }
            })
            const link=await res1.text()
            res.reply(link)
        })
    }
})
    
//Cloud.addModule(require("react-native-use-qili/cloud/events"))

Cloud.addModule(require("react-native-use-qili/cloud/expo-updates")())

//apple pay
Cloud.addModule(require("react-native-use-qili/cloud/payment-apple")({
    path:"/verifyReceipt",
    async onPurchase({purchase:{sku}, app,user}){
        const VALUES=require("./product-tokens")
        const paid=VALUES[sku]
        const validPaid=0.7*paid*100000
        await app.patchEntity("User", {_id:user._id}, {$inc:{balance:validPaid}})
        app.emit('purchase.verified', validPaid)
        return validPaid
    },
    password:process.env["apple.password"]
}))
