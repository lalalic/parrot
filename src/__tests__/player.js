
import React from "react"
import {act} from "react-test-renderer"
import Player, {NavBar, Subtitle} from "../player"
import {PlayButton, PressableIcon} from "../components"
import {Policy} from "../store"
import NumberMedia from "../widgets/number"
import { TextInput } from "react-native"

describe("play features",()=>{
    class TestMedia extends React.Component{
        render(){
            return <>{this.props.children}</>
        }
    }
    const transcript=[{cues:[
        {text:"hello0",time:100, end:5000},
        {text:"hello1",time:5000, end:7000},
        {text:"hello2",time:7000, end:15000}
    ]}]

    it("<Player media={<div/>}/>",()=>{
        expect(()=>render(<Player media={<TestMedia/>}/>)).not.toThrow()
    })

    const create=(el=<Player/>, status)=>{
        let player, updateStatus
        status={isLoaded:true, isPlaying:true, positionMillis:0, durationMillis:10*1000,...status}
        act(()=>player=render(React.cloneElement(el,{media:el.props.media||<TestMedia/>})))
        const media=player.root.findByType(TestMedia)
        updateStatus=current=>{//must dynamically call to onPlaybackStatusUpdate since onPlaybackStatusUpdate is changed on every render
            status={...status,...current}
            media.props.onPlaybackStatusUpdate(status)
        }
        media.instance.setStatusAsync=jest.fn()
        jest.useFakeTimers()//avoid update ProgressBar
        act(()=>updateStatus())
        return {player, updateStatus, media}
    }

    describe("without transcript",()=>{
        let player, updateStaus
        const current=()=>player.root.findByType(Subtitle).props.i
        beforeEach(()=>{
            ({player, updateStatus}=create());
            expect(current()).toBe(-1)
        })

        it("should not show nav buttons, except play",()=>{
            const navBar=player.root.findByType(NavBar)
            expect(navBar.findAllByType(PressableIcon).filter(a=>a.props.disabled).length).toBe(4)
            expect(navBar.findByType(PlayButton).props.disabled).not.toBe(true)
        })

        it("should not show record, video, caption, chunk",()=>{
            const controlBar=player.root.findByProps({testID:"controlBar"})
            expect(()=>controlBar.findByProps({testID:"record"})).toThrow()
            expect(()=>controlBar.findByProps({testID:"video"})).toThrow()
            expect(()=>controlBar.findByProps({testID:"caption"})).toThrow()
            expect(()=>controlBar.findByProps({testID:"chunk"})).toThrow()
        })

        it("should prepare chunks after transcript is sent",()=>{
            act(()=>updateStatus({transcript}))
            const controlBar=player.root.findByProps({testID:"controlBar"})
            expect(()=>controlBar.findByProps({testID:"record"})).not.toThrow()
            expect(()=>controlBar.findByProps({testID:"video"})).not.toThrow()
            expect(()=>controlBar.findByProps({testID:"caption"})).not.toThrow()
            expect(()=>controlBar.findByProps({testID:"chunk"})).not.toThrow()
        })
    })

    describe("with transcript",()=>{
        const policy={...Policy.general,whitespace:0,captionDelay:0}
        const handlers={
            onPolicyChange:jest.fn(),
            onRecordChunkUri: jest.fn(),
            onFinish: jest.fn(),
        }
        
        let player, updateStatus, media;
        const create0=(props,status)=>create(<Player {...{transcript, policy,...handlers,...props}}/>,{durationMillis:16000,...status})
        const current=()=>player.root.findByType(Subtitle).props.i
        beforeEach(()=>{
            ({player, updateStatus,media}=create0());
            expect(current()).toBe(0)
        })

        it("should play 2nd when positionMillis=6000",()=>{
            act(()=>updateStatus({positionMillis:6000}))
            expect(current()).toBe(1)
        })

        describe("whitespace=2",()=>{
            let player, updateStatus, media;
            const current=()=>player.root.findByType(Subtitle).props.i
            beforeEach(()=>{
                handlers.onRecordChunkUri=()=>"/var/app/hello.wav"
                ;({player, updateStatus, media}=create0({policy:{...policy,whitespace:2}}));
                expect(current()).toBe(0)
            })

            it("should play 2nd when positionMillis=6000 and whitespace>0",()=>{
                act(()=>updateStatus({positionMillis:6000}))//whitespace/start
                expect(current()).toBe(0)
                act(()=>jest.runOnlyPendingTimers())//whitespacing/end
                expect(current()).toBe(1)
            })

            fit("should have whitespace for last chunk",()=>{
                debugger
                act(()=>updateStatus({positionMillis:transcript[0].cues[2].time+100}))
                expect(current()).toBe(2)
            })

            it("should pause and record after playing each chunk",()=>{
                transcript[0].cues.slice(1).forEach((cue,i)=>{
                    act(()=>updateStatus({positionMillis:cue.time+10}))
                    expect(current()).toBe(i)
                    expect(media.instance.setStatusAsync).toHaveBeenLastCalledWith({shouldPlay:false})
                    
                    act(()=>jest.runOnlyPendingTimers())//whitespacing/end
                    act(()=>jest.runOnlyPendingTimers())//setStatusAsync({shouldPlay:true})
                    expect(current()).toBe(i+1)
                    expect(media.instance.setStatusAsync).toHaveBeenLastCalledWith({shouldPlay:true})
                })
            })    
        })

        it("should always show subtitle control(since recorder/recognizer is in it)",()=>{
            const {player,updateStatus}=create0({policy:{...policy,caption:false}})
            expect(()=>player.root.findByType(Subtitle)).not.toThrow()
            act(()=>updateStatus({positionMillis:transcript[0].cues[1].time+100}))
            expect(player.root.findByType(Subtitle).props.i).toBe(1)
        })

        it("should enable all control buttons",()=>{
            const controlBar=player.root.findByProps({testID:"controlBar"})
            const controls=controlBar.props.children
            expect(controls.length>=7).toBe(true)
            expect(controls.filter(a=>a.disabled==true).length).toBe(0)
        })

        it("should toggle record when pressiong record",()=>{
            const record=player.root.findByProps({testID:"record"})
            expect(record.props.disabled).not.toBe(true)
            act(()=>record.props.onPress())
            expect(handlers.onPolicyChange).toHaveBeenCalledWith({record:!policy.record})
        })

        it("should show Nth subtitle when caption:true and current is playing Nth chunk",()=>{
            const cue=transcript[0].cues[1]
            act(()=>updateStatus({positionMillis:cue.time+100}))
            expect(player.root.findByType(Subtitle).props.title).toBe(cue.text)
        })

        it("should delay subtitle when captionDelay",()=>{
            const {player,updateStatus}=create0({policy:{...policy,captionDelay:2}})
            const cue=transcript[0].cues[1]
            act(()=>updateStatus({positionMillis:cue.time+100}))
            expect(setTimeout.mock.calls.findIndex(a=>a[1]==2*1000)).not.toBe(-1)
        })

        it("should play 1,2,3 in order when there's no whitespace",()=>{
            transcript[0].cues.forEach((cue,i)=>{
                act(()=>updateStatus({positionMillis:cue.time+10}))
                expect(current()).toBe(i)
            })
        })

        it("should trigger onFinish only when all cues are played",()=>{
            act(()=>{
                updateStatus({didJustFinish:true})
                jest.runOnlyPendingTimers()
            })

            expect(handlers.onFinish).toHaveBeenCalledTimes(1)
        })

        it("should play prev chunk when prev is pressed",()=>{
            act(()=>updateStatus({positionMillis:transcript[0].cues[1].time+100}))
            expect(current()).toBe(1)
            
            act(()=>player.root.findByProps({testID:"prev"}).props.onPress())
            act(()=>jest.runOnlyPendingTimers())

            expect(media.instance.setStatusAsync)
                .toHaveBeenCalledWith({positionMillis:transcript[0].cues[0].time,shouldPlay:true})
        })
    })

    describe("number media",()=>{
        describe("management",()=>{
            let man, input
            beforeEach(()=>{
                global.alert.mockClear()
                man=render(<NumberMedia.Management/>)
                input=man.root.findByType(TextInput)
            })

            it("source(1,10,5) should create new number talk",()=>{
                const source="1,10,5"
                act(()=>input.props.onEndEditing({nativeEvent:{text:source}}))
                const lastCall=(a=>a[a.length-1][0])(global.dispatch.mock.calls)
                expect(lastCall).toMatchObject({type:"talk/toggle",talk:{}, payload:{source, shadowing:{}}})
            })

            it("source(5,1,5) should be alerted",()=>{
                act(()=>input.props.onEndEditing({nativeEvent:{text:"5,1,5"}}))
                expect(global.alert).toHaveBeenCalledTimes(1)
            })

            it("source(1,5,0) should be alerted",()=>{
                act(()=>input.props.onEndEditing({nativeEvent:{text:"1,5,0"}}))
                expect(global.alert).toHaveBeenCalledTimes(1)
            })
        })
        

        it("should be allowed to control whitespace",()=>{
            const onPlaybackStatusUpdate=jest.fn()
            render(<NumberMedia onPlaybackStatusUpdate={onPlaybackStatusUpdate}/>)
            const call=onPlaybackStatusUpdate.mock.calls.find(([a])=>!!a.transcript)
            expect(call[0].transcript[0].cues.length>0).toBe(true)
        })

        xit("should only position 1 when set position between 1.time and 1.end",()=>{
            const onPlaybackStatusUpdate=jest.fn()
            const media=render(<NumberMedia onPlaybackStatusUpdate={onPlaybackStatusUpdate}/>)
        })
    })
})

describe("talk",()=>{
    it("should clear all policy history when pressing clear",()=>{

    })

    it("should clear talk's history when long pressing clear",()=>{
        
    })
})