import React from "react"
import renderer from "react-test-renderer"
import {Provider, createStore} from "../store"
import "../default-style"

describe("store",()=>{
    it("<Provider/>=render()",()=>{
        const provider=renderer.create(<Provider persistor={false}/>)
        expect(provider.root.type).toBe(Provider)
        expect(render().root.type).toBe(Provider)
    })
    let store
    beforeEach(()=>store=createStore(false).store)

    describe("talk",()=>{
        const talk={id:"hello",slug:"1",title:"hello",thumb:1}
            
        it("talk/toggle",()=>{
            expect(store.getState().talks.hello).toBe(undefined)
            store.dispatch({type:"talk/toggle",key:"favorite", talk})
            expect(store.getState().talks.hello).toMatchObject({...talk,favorite:true})
            store.dispatch({type:"talk/toggle",key:"favorite", talk})
            expect(store.getState().talks.hello).toMatchObject({...talk,favorite:false})
            const shadowing={chunk:5, record:true}
            store.dispatch({type:"talk/toggle",key:"shadowing", talk, value:shadowing})
            expect(store.getState().talks.hello.shadowing).toMatchObject(shadowing)
        })

        it("talk/toggle playload",()=>{
            store.dispatch({type:"talk/toggle", talk, payload:{a:1, b:undefined}})
            expect(store.getState().talks[talk.id]).toMatchObject({a:1,b:true})
            store.dispatch({type:"talk/toggle", talk, payload:{a:2, b:undefined}})
            expect(store.getState().talks[talk.id]).toMatchObject({a:2,b:false})
        })

        describe(`{talks:{hello, hello1}}}`,()=>{
            const talks=[talk, {...talk, id:"hello1",slug:"hello1"}]
            beforeEach(()=>{
                store.dispatch({type:"talk/toggle",key:"favorite", talk:talks[0]})
                store.dispatch({type:"talk/toggle",key:"favorite", talk:talks[1]})
                expect(Object.values(store.getState().talks)).toMatchObject(talks)
            })

            it("talk/clear: to clear one talk",()=>{
                store.dispatch({type:"talk/clear", id:talks[0].id})
                store.dispatch({type:"talk/clear", id:"not exist"})
                store.dispatch({type:"talk/clear", id:1})
                expect(store.getState().talks[talks[0].id]).toBe(undefined)
                expect(store.getState().talks[talks[1].id]).toMatchObject(talks[1])
            })
    
            it("talk/clear/all: to clear all talks",()=>{
                store.dispatch({type:"talk/clear/all"})
                expect(Object.values(store.getState().talks).length).toBe(0)
            })

            it("talk/clear/history: to clear history of a talk",()=>{
                const history={record:false, chunk:5}
                store.dispatch({type:"talk/toggle", talk, key:"shadowing", value:history})
                store.dispatch({type:"talk/clear/history", id:talk.id})
                expect(store.getState().talks[talk.id].shadowing).toBe(undefined)
            })

            it("should be able to change part of general policy",()=>{
                const history={record:false, chunk:5, challenges:[{}]}
                store.dispatch({type:"talk/toggle", talk, key:"shadowing", value:history})
                store.dispatch({type:"talk/policy", talk, target:"shadowing", payload:{chunk:1}})
                expect(store.getState().talks[talk.id].shadowing).toMatchObject({...history, chunk:1})
            })

            describe("challenging",()=>{
                it("should not be challenging when there's no challenges",()=>{
                    store.dispatch({type:"talk/toggle",talk, key:"challenging", value:true, policy:"shadowing"})
                    expect(store.getState().talks[talk.id].shadowing?.challenging).not.toBe(true)
                    store.dispatch({type:"talk/toggle",talk, key:"challenging", policy:"shadowing"})
                    expect(store.getState().talks[talk.id].shadowing?.challenging).not.toBe(true)
                })
    
                it("{talk/toggle, challenging:true} should be challenging when there's challenges",()=>{
                    const chunk={text:"hello", time:500, end:5000}
                    store.dispatch({type:"talk/challenge",talk, chunk, policy:"shadowing"})
                    
                    
                    store.dispatch({type:"talk/toggle",talk, key:"challenging", value:true, policy:"shadowing"})
                    expect(store.getState().talks[talk.id].shadowing.challenging).toBe(true)
                })
    
                it("{talk/toggle, challenging} should be challenging when there's challenges",()=>{
                    const chunk={text:"hello", time:500, end:5000}
                    store.dispatch({type:"talk/challenge",talk, chunk, policy:"shadowing"})
                    
                    store.dispatch({type:"talk/toggle",talk, key:"challenging", policy:"shadowing"})
                    expect(store.getState().talks[talk.id].shadowing.challenging).toBe(true)
                })

                it("{talk/toggle, challenging} should be challenging when there's challenges",()=>{
                    const chunk={text:"hello", time:500, end:5000}
                    store.dispatch({type:"talk/challenge",talk, chunk, policy:"shadowing"})
                    store.dispatch({type:"talk/toggle",talk, key:"challenging", policy:"shadowing"})
                    expect(store.getState().talks[talk.id].shadowing.challenging).toBe(true)
                    store.dispatch({type:"talk/challenge",talk, chunk, policy:"shadowing"})
                    expect(store.getState().talks[talk.id].shadowing.challenges.length).toBe(0)
                    store.dispatch({type:"talk/toggle",talk, key:"challenging", policy:"shadowing"})
                    expect(store.getState().talks[talk.id].shadowing.challenging).not.toBe(true)
                })

                it("should not allow change policy.chunk when challenging",()=>{
                    const chunk={text:"hello", time:500, end:5000}
                    const history={record:true, volume:50, chunk:2}
                    store.dispatch({type:"talk/toggle",talk, key:"shadowing", value:history})
                    store.dispatch({type:"talk/challenge",talk, chunk, policy:"shadowing"})
                    store.dispatch({type:"talk/toggle",talk, key:"challenging", policy:"shadowing"})
                    expect(store.getState().talks[talk.id].shadowing.challenging).toBe(true)

                    store.dispatch({type:"talk/policy",talk, target:"shadowing", payload:{chunk:5}})
                    expect(store.getState().talks[talk.id].shadowing).toMatchObject(history)
                })

            })

            
            it("talk/recording: to save record for a chunk",()=>{
                const record={"500-5000":"hello"}
                store.dispatch({type:"talk/recording",talk, record:{"500-5000":"hello"}, policy:"shadowing"})
                expect(store.getState().talks[talk.id].shadowing.records["500-5000"]).toBe("hello")
                store.dispatch({type:"talk/recording",talk, record:{"500-5000":"hello1"}, policy:"shadowing"})
                expect(store.getState().talks[talk.id].shadowing.records["500-5000"]).toBe("hello1")
            })
    
            it("talk/challenge: to toggle a chunk as a challenge",()=>{
                const chunk={text:"hello", time:500, end:5000}
                store.dispatch({type:"talk/challenge",talk, chunk, policy:"shadowing"})
                expect(store.getState().talks[talk.id].shadowing.challenges.length).toBe(1)
                const chunk1={time:5500, end:7000}
                store.dispatch({type:"talk/challenge",talk, chunk:chunk1, policy:"shadowing"})
                expect(store.getState().talks[talk.id].shadowing.challenges.length).toBe(2)

                store.dispatch({type:"talk/challenge",talk, chunk, policy:"retelling"})
                expect(store.getState().talks[talk.id].retelling.challenges.length).toBe(1)

                store.dispatch({type:"talk/challenge",talk, chunk, policy:"shadowing"})
                expect(store.getState().talks[talk.id].shadowing.challenges.length).toBe(1)
                expect(store.getState().talks[talk.id].retelling.challenges.length).toBe(1)
            })
        })
    })

    it("should save search history",()=>{
        store.dispatch({type:"history", q:"hello"})
        expect(store.getState().history.q).toBe("hello")
    })

    describe("number widget",()=>{

    })

    describe("plan",()=>{
        const plan={start:new Date(),policy:"shadowing", id:"hello"}
        const plan1={...plan, start:new Date(Date.now()-8*24*60*60*1000)}

        beforeEach(()=>{
            store.dispatch({type:"plan",plan})
            store.dispatch({type:"plan",plan:plan1})
        })

        it("{type:plan, plan} should create a plan",()=>{
            let a=plan.start
            expect(store.getState().plan[a.getFullYear()][a.getWeek()][a.getDay()][Math.floor(a.getHalfHour())]).toBe(plan)
            a=plan1.start
            expect(store.getState().plan[a.getFullYear()][a.getWeek()][a.getDay()][Math.floor(a.getHalfHour())]).toBe(plan1)
        })

        it("plan/remove can remove a plan",()=>{
            store.dispatch({type:"plan/remove",time:plan.start})
            let a=plan.start
            expect(!!store.getState().plan[a.getFullYear()][a.getWeek()]).not.toBe(true)
            a=plan1.start
            expect(store.getState().plan[a.getFullYear()][a.getWeek()][a.getDay()][Math.floor(a.getHalfHour())]).toBe(plan1)
        })

        it("plan/copy/1 day",()=>{

        })

        it("plan/copy/7 days",()=>{

        })
    })

    describe("policy",()=>{
        it("should have default polices",()=>{
            expect(Object.keys(store.getState().policy)).toMatchObject(["general","shadowing","dictating","retelling"])
        })

        it("should change policy partially",()=>{
            const {shadowing}=store.getState().policy
            store.dispatch({type:"policy",target:"shadowing", payload:{chunk:5}})
            expect(store.getState().policy.shadowing).not.toMatchObject(shadowing)
            expect(store.getState().policy.shadowing).toMatchObject({...shadowing,chunk:5})
        })
    })


    describe.each([
        ["audiobook"],
        ["picturebook"]
    ])("%s",book=>{
        const record={uri:"xxx",duration:500, text:"good"}
            
        beforeEach(()=>{
            expect(store.getState()[book].length).toBe(0)
            store.dispatch({type:book+"/record",...record})
            expect(store.getState()[book].length).toBe(1)
        })

        it(book+"/record",()=>{
            store.dispatch({type:book+"/record",...record, uri:"xxx2"})
            expect(store.getState()[book].length).toBe(2)
        })

        it(book+"/remove",()=>{
            store.dispatch({type:book+"/remove", uri:record.uri})
            expect(store.getState()[book].length).toBe(0)
        })

        it(book+"/tag",()=>{
            expect((store.getState()[book][0].tags||[]).length).toBe(0)
            store.dispatch({type:book+"/tag", uri:record.uri, tag:"word"})
            expect(store.getState()[book][0].tags[0]).toBe("word")
            store.dispatch({type:book+"/tag", uri:record.uri, tag:"hello"})
            expect(store.getState()[book][0].tags).toMatchObject(["word","hello"])
            //toggle
            store.dispatch({type:book+"/tag", uri:record.uri, tag:"hello"})
            expect(store.getState()[book][0].tags.includes("hello")).toBe(false)
            
        })

        it(book+"/clear",()=>{
            store.dispatch({type:book+"/clear"})
            expect(store.getState()[book].length).toBe(0)
        })

        it(book+"/set",()=>{
            store.dispatch({type:book+"/set", uri:record.uri, text:"changed"})
            expect(store.getState()[book][0]).toMatchObject({...record, text:"changed"})
        })
    })

    
})