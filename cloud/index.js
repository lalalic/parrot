const {withFilter}=require("graphql-subscriptions")
let uuid=Date.now()

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
            answerHelp(session:String!, response:JSON!):JSON
            removeHelper(helper:String!):Boolean
        }

        extend type Mutation{
            save(talk:JSON!):Boolean
            remove(id:String!, type:String):Boolean
        }

        extend type Subscription{
            askThenWaitAnswer(message:JSON!):JSON
            helpQueue(helper:String!):JSON
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
            answerHelp(_,{session, response}, {app}){
                app.pubsub.publish("answerHelp", {session, response})
                return true
            },
            removeHelper(_,{helper},{app}){
                Helpers.remove(helper)
                return true
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
            }
        },
        Subscription:{
            askThenWaitAnswer:{
                subscribe(_,{message}, {app}){
                    const session=`${++uuid}`
                    app.pubsub.publish("askHelp", {session, message})
                    try{
                        return withFilter(
                            ()=>app.pubsub.asyncIterator(['answerHelp']),
                            payload=>payload.session==session,
                        )(...arguments)
                    }finally{
                        if(Helpers.no){
                            app.pubsub.publish("answerHelp", {session, response:new Error("We can't process your request now!")})
                        }
                    }
                },
                resolve(payload,{message}){
                    return payload.response
                }
            },

            helpQueue:{
                subscribe(_,{helper}, {app}){
                    Helpers.add(helper)
                    return withFilter(
                        ()=>app.pubsub.asyncIterator(["askHelp"]),
                        payload=>Helpers.pick1(payload)===helper
                    )(...arguments)
                },
                unsubscribe(_,{helper},{}){
                    Helpers.remove(helper)
                },
                resolve(payload,{helper},{app}){
                    Helpers.done1(payload)
                    return payload
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

class Helpers{
    constructor(){
        const helpers=[], sessions={}
        Helpers.add=this.add=function(helper){
            const id=helper//`user${++uuid}`
            if(!!helpers.find(a=>a.id==id)){
                helpers.push({id,sessions:[]})
            }
            return id
        }

        Helpers.remove=this.remove=function(helper){
            const i=helpers.findIndex(a=>a.id==helper)
            helpers.splice(i,1)
            return helper
        }

        Helpers.pick1=this.pick1=function({session, message}){
            if(session in sessions)
                return
            const min=helpers.reduce((min,a)=>{
                if(a.sessions.length<min.sessions.length){
                    return a
                }
                return min
            },helpers[0])
            min.sessions.push(session)
            sessions[session]=min.id
            return min.id
        }
        Helpers.done1=this.done1=function({session}){
            const id=sessions[session]
            const helper=helpers.find(a=>a.id==id)
            helper.sessions.splice(helper.sessions.indexOf(session),1)
            delete sessions[session]
        }
    }

    static instance=new Helpers()
}

module.exports=Cloud
