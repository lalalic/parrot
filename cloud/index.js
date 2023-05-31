const Talk_Fields=`
            id:ID!,
            slug:String!,
            title: String!,
            duration: Int,
            description:String,
            speaker: String,
            thumb: URL,
            tags: [String],
            video: URL!,
            languages: JSON,
            source: String,
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
            file_exists(key:String):Boolean
        }

        extend type Mutation{
            save(talk:JSON!):Boolean
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
                const filter={slug,_id}
                slug ? delete filter._id : (_id && delete filter.slug)
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
            file_exists(_,{key},{app}){
                return app.get1Entity("File",{_id:key})
                    .then(file=>!!file)
            }
        },
        Mutation:{
            save(_,{talk},{app}){
                return app.createEntity("Talk",talk)
                    .then(talk=>true)
                    .catch(e=>false)
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
        }`
    },
    index:{
        Talk:[{speaker:1, title:1, slug:1}]
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
