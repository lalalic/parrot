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
    typeDefs:`
        type Anonymous{
            test:String
        }

        type Talk implements Node{
            ${Talk_Fields}
        }

        extend type Query{
            talk(slug:String, id:String):Talk
            talks(q:String, duration: Int):[Talk]
            people(q:String):[Talk]
            speakerTalks(speaker:String):[Talk]
            today:[Talk]
            widgetTalks(slug:String, q:String):[Talk]
            dailyPicture(today:String):JSON
        }

        extend type Mutation{
            save(talk:JSON!):Boolean
            remove(id:String!, type:String):Boolean
            identifiedInDailyPicture(today:String!, uri:String!, text:String!):Boolean
        }

        extend type Subscription{
            objectsInDailyPicture(today:String!):[JSON]
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
                    if(_id.startsWith("DailyPicture/")){
                        const [,today]=_id.split("/")
                        return await app.cloud.resolvers.Query.dailyPicture(_,{today},arguments[2])
                    }
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

            async dailyPicture(_,{today=asDateString(new Date())},{app}){
                debugger
                const key=`Widget/DailyPicture/${today}.png`, filter={_id:key}
                const exist=await app.get1Entity("File",filter)
                let thumb, data=[]
                if(!exist){
                    const uri="https://source.unsplash.com/random/900*1800/?night,city"
                    thumb=await app.upload({uri,key,host:"Widget:DailyPicture"})
                    await app.updateEntity("File",filter, {$set:{objects:[]}})
                }else{
                    thumb=app.cloud.resolvers.File.url(exist,{},arguments[2])
                    data=exist.objects
                }

                return {
                    thumb,
                    data,
                    _id:"DailyPicture",
                    slug:"picturebook",
                    title: today,
                }
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
            async identifiedInDailyPicture(_,{today, ...identified},{app}){
                const key=`Widget/DailyPicture/${today}.png`
                const filter={_id:key}
                await app.updateEntity("File",filter, {$push:{objects: identified}})
                app.pubsub.publish("Identified_In_Daily_Picture", {today, identified})
                return true
            }
        },
        Subscription:{
            objectsInDailyPicture:{
                subscribe(_,{},{app}){
                    return app.pubsub.asyncIterator("Identified_In_Daily_Picture")
                },
                async resolve(_,{today},{app}){
                    if(today==_.today){
                        return [_.identified]
                    }
                }
            }
        }
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
        }`,
        dailyPicture:`query today_Query($today:String){
            dailyPicture(today:$today)
        }`,

        objectsInDailyPicture:`subscription a($today:String!){
            objectsInDailyPicture(today:$today)
        }`
    },
    indexes:{
        Talk:[{speaker:1}, {title:1, lang:1, mylang:1}, {slug:1}],
        Widget:[{title:1, slug:1, lang:1, mylang:1}]
    },
    proxy:{
        ted: {
            target:"https://www.ted.com",
            changeOrigin:true,
        },
        openai:{
            target:"https://api.openai.com",
            changeOrigin:true,
            headers: {
               // 'Authorization': `Bearer ${apiKey}`
            },
        }
    },
    supportAnonymous:true,
})
function asDateString(a){
    const pad=i=>String(i).padStart(2,"0")
    return `${a.getFullYear()}-${pad(a.getMonth()+1)}-${pad(a.getDate())}`
}

module.exports=Cloud
