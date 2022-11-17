
import React from "react"
import {act} from "react-test-renderer"
import Player, {NavBar, Subtitle} from "../player"
import {PlayButton, PressableIcon, SliderIcon} from "../components"
import {Policy} from "../store"

describe("play features",()=>{
    it("<Player media={<div/>}/>",()=>{
        expect(()=>render(<Player media={<div/>}/>)).not.toThrow()
    })

    const create=(el=<Player media={<div/>} />)=>{
        let player, updateStaus
        act(()=>player=render(el))
        const media=player.root.findByType('div')
        updateStaus=media.props.onPlaybackStatusUpdate
        jest.useFakeTimers()//avoid update ProgressBar
        act(()=>updateStaus({isLoaded:true}))
        return {player, updateStaus}
    }

    describe("without transcript",()=>{
        let player, updateStaus
        beforeEach(()=>{
            ({player, updateStatus }=create());
        })
        it("should not show nav buttons, except play",()=>{
            const navBar=player.root.findByType(NavBar)
            expect(navBar.findAllByType(PressableIcon).filter(a=>a.props.disabled).length).toBe(4)
            expect(navBar.findByType(PlayButton).props.disabled).not.toBe(true)
        })

        it("should not show record, video, caption, subtitle, chunk",()=>{
            const controlBar=player.root.findByProps({testID:"controlBar"})
            expect(()=>controlBar.findByProps({testID:"record"})).toThrow()
            expect(()=>controlBar.findByProps({testID:"video"})).toThrow()
            expect(()=>controlBar.findByProps({testID:"caption"})).toThrow()
            expect(()=>controlBar.findByType(Subtitle)).toThrow()
            expect(()=>controlBar.findByProps({testID:"chunk"})).toThrow()
        })
    })

    describe("with transcript",()=>{
        const transcript=[{cues:[
            {text:"hello0",time:100, end:5000},
            {text:"hello1",time:5000, end:7000},
            {text:"hello2",time:7000, end:15000}
        ]}]
        const policy=Policy.general
        const handlers={
            onPolicyChange:jest.fn(),
        }
        const create0=props=>create(<Player {...{media:<div/>, transcript, policy,...handlers, ...props}}/>)

        describe.skip("corresponding nav bar: or ignore action",()=>{
            it("should diable slow_prev, prev, next when only 1 cue",()=>{

            })
    
            it("should disable slow_prev, prev when current is first",()=>{
    
            })
    
            it("should disable next when current is last",()=>{
    
            })
        })

        it("should enable all control buttons",()=>{
            const controlBar=create0().player.root.findByProps({testID:"controlBar"})
            const controls=controlBar.props.children
            expect(controls.length>=7).toBe(true)
            expect(controls.filter(a=>a.disabled==true).length).toBe(0)
        })

        it("should toggle record when pressiong record",()=>{
            const record=create0().player.root.findByProps({testID:"record"})
            expect(record.props.disabled).not.toBe(true)
            act(()=>record.props.onPress())
            expect(handlers.onPolicyChange).toHaveBeenCalledWith({record:!policy.record})
        })

        it("should play 1,2,3 in order when there's no whitespace",()=>{

        })

        it("should pause and record after playing each chunk when policy has whitespace",()=>{
            
        })

        it("should only rerender progress bar when status is not changed although media position changed",()=>{

        })

        it("should trigger onFinish only when all cues are played",()=>{

        })

        it("should play prev chunk when prev is pressed",()=>{

        })

        describe("number media",()=>{
            it("should be allowed to control whitespace",()=>{

            })

            it("should only position 1 when set position between 1.time and 1.end",()=>{
                
            })
        })
    })
})

describe("talk",()=>{
    it("should clear all policy history when pressing clear",()=>{

    })

    it("should clear talk's history when long pressing clear",()=>{
        
    })
})