const { withFilter }=require("graphql-subscriptions")
const { RedisPubSub }=require("graphql-redis-subscriptions")
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
            answerHelp(session:String!, response:JSON!):JSON
            removeHelper(helper:String!):Boolean
            isAdmin:Boolean
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
                app.pubsub.publish("answer", {session, response})
                return true
            },
            isAdmin(_,{},{app,user}){
                return app.get1Entity("User",{_id:user._id}).then(user=>user.isAdmin)
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
                subscribe(_,{message}, {app, user}){
                    if(Helpers.no){
                        app.logger.info('No helper, discard an ask')
                        throw new Error("Your request can't be processed now!")
                    }
                    const ask={session:`${++uuid}`,message}
                    app.pubsub.publish("ask", ask)
                    return withFilter(
                        ()=>app.pubsub.asyncIterator(['answer']),
                        answer=>{
                            const answered=answer.session==ask.session
                            if(answered){
                                app.logger.info(`ask[${answer.session}] is answered and returned to asker`)
                            }
                            return answered
                        },
                    )(...arguments)
                },
                resolve(answer){
                    return answer.response
                }
            },

            helpQueue:{
                subscribe(_,{helper}, {app,user}){
                    Helpers.add(helper=user._id||helper)
                    return withFilter(
                        ()=>app.pubsub.asyncIterator(["ask"]),
                        ask=>{
                            const picked=Helpers.pick1(ask)===helper
                            if(picked){
                                app.logger.info(`ask[${ask.session}] is send to helper[${helper}]`)
                            }
                            return picked
                        }
                    )(...arguments)
                },
                resolve(ask,{},{app,user}){
                    Helpers.done1(ask)
                    return ask
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
        }`
    },
    indexes:{
        Talk:[{speaker:1}, {title:1, lang:1, mylang:1}, {slug:1}],
        Widget:[{title:1, slug:1, lang:1, mylang:1}]
    },
    pubsub:{
        init(){
            return new RedisPubSub({
                connection: {
                    host:"qili.pubsub",
                }
            })
        }, 
        onDisconnect({app,user, request}){
            switch(request?.id){
                case "helpQueue":
                    Helpers.remove(user._id)
                    Helpers.remove(request.variables.helper)
                break
            }
        }
    },
})
 
class Helpers{
    constructor(){
        const helpers=[], sessions={}
        Helpers.add=this.add=function(helper){
            const id=helper
            if(!helpers.find(a=>a.id==id)){
                helpers.push({id,sessions:[]})
                console.info(`helper[${helper}] join`)
            }
            return id
        }

        Helpers.remove=this.remove=function(helper){
            const i=helpers.findIndex(a=>a.id==helper)
            if(i!=-1){
                helpers.splice(i,1)
                console.info(`helper[${helper}] left!`)
                return helper
            }
        }

        Helpers.pick1=this.pick1=function({session, message}){
            console.debug({helpers, sessions})
            if(session in sessions)
                return

            let picker
            if(message.options?.helper){
                picker=helpers.find(a=>a.id==message.options.helper)    
            }

            if(!picker){
                picker=helpers.reduce((min,a)=>{
                    if(a.sessions.length<min.sessions.length){
                        return a
                    }
                    return min
                },helpers[0])
            }


            picker.sessions.push(session)
            sessions[session]=picker.id
            console.info(`pick helper[${picker.id}] for ask[${session}]`)
            return picker.id
        }
        Helpers.done1=this.done1=function({session}){
            const helperId=sessions[session]
            if(!helperId)
                return 
            const helper=helpers.find(a=>a.id==helperId)
            if(!helper)
                return 
            const i=helper.sessions.indexOf(session)
            if(i==-1)
                return 
            helper.sessions.splice(i,1)
            delete sessions[session]
            console.info(`ask[${session}] picked and removed from queue`)
        }

        Object.defineProperty(Helpers,"no",{
            get(){
                return helpers.length==0
            }
        })
    }


    static instance=new Helpers()
}

module.exports=Cloud
