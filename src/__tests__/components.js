import React from "react"
import { Pressable } from "react-native"
import renderer, {act,} from "react-test-renderer"
import { PressableIcon } from "../components"
const {Recorder}=jest.requireActual('../components')

describe("components",()=>{
    describe("PlaySound for audio",()=>{
        
    })

    describe("Speak Text",()=>{

    })

    fdescribe("Recorder", ()=>{
        it("should show a button as a trigger",()=>{
            const recorder=render(<Recorder/>)
            expect(()=>recorder.root.findByType(PressableIcon)).not.toThrow()
        })

        it("should be able to customize the trigger",()=>{
            const {root}=render(<Recorder trigger={<Pressable><span>Hold To Talk</span></Pressable>}/>)
            expect(()=>root.findByType("span")).not.toThrow()
            const button=root.findByType(Pressable)
            expect(button.props.recording).toBe(false)
            expect(!!button.props.onPressIn && !!button.props.onPressOut).toBe(true)
        })

        fit("should show children only when being held",()=>{
            const {root}=render(<Recorder children={<span>recognized text</span>}/>)
            expect(()=>root.findByType('span')).toThrow()
            const button=root.findByType(PressableIcon)
            act(()=>button.props.onPressIn())
            expect(()=>root.findByType('span')).not.toThrow()
            act(()=>button.props.onPressOut())
            expect(()=>root.findByType('span')).toThrow()
        })

        it("should show a cancel button when being held",()=>{})

        it("should show a recognization button when being held",()=>{})

        it("should cancel when sliding to cancel button",()=>{})

        it("should recognize text when sliding to recognition button",()=>{})

        it("should not allow any action on elements other than cancel/recognize button",()=>{})
    })

    describe("Recognizer: ",()=>{

    })

    describe("speak",()=>{
        describe("session",()=>{
            it.each([
                
            ])("%s", ()=>{

            })
        })
    })


})