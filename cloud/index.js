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
        }

        extend type Mutation{
            save(talk:JSON!):Boolean
            remove(id:String!, type:String):Boolean
        }
    `,
    resolver:{
        Anonymous:{

        },
        Talk:{
            id:({_id})=>_id,
        },
        Query:{
            talk(_,{slug, id:_id},{app,user}){
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
    },
    indexes:{
        Talk:[{speaker:1}, {title:1}, {slug:1}],
        Widget:[{title:1, slug:1}]
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

module.exports=Cloud
