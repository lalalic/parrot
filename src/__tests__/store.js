import React from "react"
import renderer from "react-test-renderer"
import {Provider} from "../store"

describe("store",()=>{
    it("<Provider/>=render()",()=>{
        const provider=renderer.create(<Provider persistor={false}/>)
        expect(provider.root.type).toBe(Provider)
        expect(render().root.type).toBe(Provider)
    })

    it("@init",()=>{
        
    })

    describe("talk",()=>{
        it("talk/clear: to clear all talks",()=>{

        })
    
        it("",()=>{
            
        })
    })

    describe("search history",()=>{

    })

    describe("number widget",()=>{

    })

    describe("policy",()=>{

    })

    describe("audio book",()=>{

    })

    describe("picture book",()=>{

    })
})