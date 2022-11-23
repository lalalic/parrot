jest.mock("../store",()=>({
    ...jest.requireActual('../store'),
    selectBook:jest.fn(),
 }))

import React from "react"
import {act} from "react-test-renderer"
import Player, {NavBar, Subtitle} from "../player"
import {PlayButton, PressableIcon, Recognizer} from "../components"
import {Policy, selectBook} from "../store"
import NumberMedia from "../widgets/number"
import AudioBook from "../widgets/audio-book"
import PictureBook from "../widgets/picture-book"
import { TextInput } from "react-native"

describe("play features",()=>{
    class TestMedia extends React.Component{
        render(){
            return <>{this.props.children}</>
        }
        setStatusAsync(){

        }
    }
    const transcript=[{cues:[
        {text:"hello0",time:100, end:5000},
        {text:"hello1",time:5000, end:7000},
        {text:"hello2",time:7000, end:15000}
    ]}]

    beforeAll(()=>jest.useFakeTimers())

    it("<Player media={<div/>}/>",()=>{
        expect(()=>render(<Player media={<TestMedia/>} policy={Policy.general}/>)).not.toThrow()
    })

    const create=(el=<Player/>, status)=>{
        let player, updateStatus
        status={isLoaded:true, isPlaying:true, positionMillis:0, durationMillis:10*1000,...status}
        const mediaEl=el.props.media||<TestMedia/>
        act(()=>player=render(React.cloneElement(el,{media:mediaEl, policy:el.props.policy||Policy.general})))
        const media=player.root.findByType(mediaEl.type)
        updateStatus=current=>{//must dynamically call to onPlaybackStatusUpdate since onPlaybackStatusUpdate is changed on every render
            status={...status,...current}
            media.props.onPlaybackStatusUpdate(status)
        }
        jest.spyOn(media.instance,"setStatusAsync")
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

        it("should prepare chunks after transcript is sent by state",()=>{
            act(()=>{
                updateStatus({transcript})
                jest.runOnlyPendingTimers()
            })

            const controlBar=player.root.findByProps({testID:"controlBar"})
            expect(()=>controlBar.findByProps({testID:"record"})).not.toThrow()
            expect(()=>controlBar.findByProps({testID:"video"})).not.toThrow()
            expect(()=>controlBar.findByProps({testID:"caption"})).not.toThrow()
            expect(()=>controlBar.findByProps({testID:"chunk"})).not.toThrow()
        })

        it("should prepare chunks after transcript is set by props",()=>{
            act(()=>player.update(<Player {...player.root.findByType(Player).props} transcript={transcript}/>))
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

            it("should whitespace when after 1st",()=>{
                act(()=>updateStatus({positionMillis:transcript[0].cues[0].end+100}))//whitespace/start
                expect(current()).toBe(0)
                expect(()=>player.root.findByType(Recognizer)).not.toThrow()
                act(()=>jest.runOnlyPendingTimers())//whitespacing/end
                expect(()=>player.root.findByType(Recognizer)).toThrow()
                expect(current()).toBe(1)
            })

            it("should not whitespace when jump from 0 to 2",()=>{
                act(()=>updateStatus({positionMillis:transcript[0].cues[2].time+100}))
                expect(current()).toBe(2)
                expect(()=>player.findByType(Recognizer)).toThrow()
            })

            it("should have whitespace for last chunk",()=>{
                act(()=>updateStatus({positionMillis:transcript[0].cues[2].time+100}))
                expect(current()).toBe(2)
                act(()=>updateStatus({positionMillis:transcript[0].cues[2].end+100}))
                expect(current()).toBe(2)
                expect(()=>player.root.findByType(Recognizer)).not.toThrow()
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
            handlers.onFinish.mockClear()
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
        describe("tags",()=>{
            let man, input
            beforeEach(()=>{
                global.alert.mockClear()
                man=render(<NumberMedia.Tags/>)
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
        
        describe("with player",()=>{
            let player,media, updateStatus
            beforeEach(()=>{
                ({player,media, updateStatus}=create(<Player media={<NumberMedia/>}/>));
                act(()=>jest.runOnlyPendingTimers())
            })

            it("nav.next is enabled",()=>{
                expect(player.root.findByProps({testID:"next"}).props.disabled).not.toBe(true)
            })

            it("should be allowed to control whitespace",()=>{
                expect(()=>player.root.findByProps({testID:"whitespace"})).not.toThrow()
            })

            it("should only position 1 when set position between 1.time and 1.end",()=>{
                act(()=>{media.instance.setStatusAsync({positionMillis:media.instance.cues[1].time+100})})
                expect(media.instance.progress.current).toBe(media.instance.cues[1].time)
            })
        })
    })

    describe("audiobook",()=>{
        it("<Player media={<AudioBook/>}> without book",()=>{
            selectBook.mockReturnValue([])
            const {player,media, updateStatus}=create(<Player media={<AudioBook/>}/>)
            act(()=>jest.runOnlyPendingTimers())
            expect(player.root.findByProps({testID:"next"}).props.disabled).toBe(true)
        })

        it("<Player media={<AudioBook/>}> with book",()=>{
            selectBook.mockReturnValue([{uri:"1",text:"hello",duration:1000},{uri:"2",text:"hello",duration:2000}])
            const {player,media, updateStatus}=create(<Player media={<AudioBook/>}/>)
            act(()=>jest.runOnlyPendingTimers())
            expect(player.root.findByProps({testID:"next"}).props.disabled).not.toBe(true)
        })
    })

    describe("picturebook",()=>{
        it("<Player media={<AudioBook/>}> without book",()=>{
            selectBook.mockReturnValue([])
            const {player,media, updateStatus}=create(<Player media={<PictureBook/>}/>)
            act(()=>jest.runOnlyPendingTimers())
            expect(player.root.findByProps({testID:"next"}).props.disabled).toBe(true)
        })

        it("<Player media={<AudioBook/>}> with book",()=>{
            selectBook.mockReturnValue([{uri:"1",text:"hello",duration:1000},{uri:"2",text:"hello",duration:2000}])
            const {player,media, updateStatus}=create(<Player media={<PictureBook/>}/>)
            act(()=>jest.runOnlyPendingTimers())
            expect(player.root.findByProps({testID:"next"}).props.disabled).not.toBe(true)
        })
    })
})

describe("talk",()=>{
    it("should clear all policy history when pressing clear",()=>{

    })

    it("should clear talk's history when long pressing clear",()=>{
        
    })
})