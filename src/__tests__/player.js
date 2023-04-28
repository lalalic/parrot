jest.mock("../store",()=>({
    ...jest.requireActual('../store'),
    selectBook:jest.fn(),
 }))

import React from "react"
import {act} from "react-test-renderer"
import Player, {NavBar, Subtitle} from "../components/player"
import {PlaySound} from "../components"
import {Policy, selectBook} from "../store"
import { ListMedia } from "../widgets/media"
import NumberMedia from "../widgets/number"
import AudioBook from "../widgets/audio-book"
import PictureBook from "../widgets/picture-book"
import { Image, TextInput, ActivityIndicator } from "react-native"

describe("play features",()=>{
    class TestMedia extends React.Component{
        render(){
            return <>{this.props.children}</>
        }
    }

    const transcript=[{cues:[
        {text:"hello0",time:100, end:4500},
        {text:"hello1",time:5000, end:6500},
        {text:"hello2",time:7000, end:15000}
    ]}]

    const progressUpdateIntervalMillis=100

    beforeAll(()=>jest.useFakeTimers())

    it("<Player media={<div/>}/>",()=>{
        expect(()=>render(<Player media={<TestMedia/>} policy={Policy.general}/>)).not.toThrow()
    })

    const create=(el=<Player/>, status={})=>{
        let player, updateStatus
        const mediaEl=el.props.media||<TestMedia/>
        act(()=>player=render(React.cloneElement(el,{media:mediaEl, policy:el.props.policy||Policy.general})))
        const media=player.root.findByType(mediaEl.type)

        if(media.instance.setStatusAsync){
            updateStatus=state=>{
                media.instance.setStatusSync({...state})
            }
        }else{
            media.instance.setStatusAsync=()=>{}
            status={isLoaded:true, isPlaying:true, shouldPlay:true, positionMillis:0, durationMillis:10*1000,...status}
            updateStatus=current=>{//must dynamically call to onPlaybackStatusUpdate since onPlaybackStatusUpdate is changed on every render
                status={...status,...current}
                media.props.onPlaybackStatusUpdate(status)
            }
        }
        
        jest.spyOn(media.instance,"setStatusAsync")
        act(()=>updateStatus(status))
        return {
            player, updateStatus, media, 
            status: ()=>player.root.findByType(NavBar).props.status,
            testID: testID=>player.root.findByProps({testID})
        }
    }

    describe("without transcript",()=>{
        describe.each([
            ["Arbiteral Media", <Player media={<TestMedia/>}/>],
            ["List Media", <Player media={React.createElement(class extends ListMedia{}, {shouldPlay:true})}/>]
        ])("%s", (name, element)=>{
            let player, updateStatus
            const current=()=>player.root.findByType(Subtitle).props.i
            beforeEach(()=>{
                ({player, updateStatus, media}=create(element));
                expect(current()).toBe(-1)
            })

            it("should not change state when isPlaying!=shouldPlay, or positionMillis<minPositionMillis, or whitespacing",()=>{
                const current=()=>player.root.findByType(NavBar).props.status
                const status=current()
                act(()=>updateStatus({isPlaying:false, shouldPlay:true}))
                expect(status).toMatchObject(current())
                act(()=>updateStatus({positionMillis:10, minPositionMillis:100}))
                expect(status).toMatchObject(current())
            })

            fit("should not be loading",()=>{
                expect(()=>player.root.findByType(ActivityIndicator)).toThrow()
            })

            it("should not show nav buttons, except play",()=>{
                const navBar=player.root.findByType(NavBar)
                const testID=id=>navBar.findByProps({testID:id})
                expect(testID("play").props.disabled).not.toBe(true);
                
                "slow,prev,next,check".split(",").forEach(a=>{
                    expect(testID(a).props.disabled).toBe(true)
                })
            })

            it("should not show record, video, caption, chunk",()=>{
                const controlBar=player.root.findByProps({testID:"controlBar"})
                expect(()=>controlBar.findByProps({testID:"record"})).toThrow()
                expect(()=>controlBar.findByProps({testID:"video"})).toThrow()
                expect(()=>controlBar.findByProps({testID:"caption"})).toThrow()
                expect(()=>controlBar.findByProps({testID:"chunk"})).toThrow()
            })
        })
    })

    describe("with transcript",()=>{
        describe.each([
            ["Normal Media", <Player media={<TestMedia/>} transcript={transcript}/>],
            ["List Media", <Player media={React.createElement(
                class extends ListMedia{
                    createTranscript(){
                        return transcript[0].cues
                    }
                },{shouldPlay:true, progressUpdateIntervalMillis}
            )}/>]
            
        ])("%s", (name, element)=>{
            const policy={...Policy.general,whitespace:0,captionDelay:0}
            const handlers={
                onPolicyChange:jest.fn(),
                onRecordChunkUri: jest.fn(),
                onFinish: jest.fn(),
            }
            
            let player, updateStatus, media, status;
            const durationMillis=16000
            const [{cues}]=transcript
            
            const create0=(props,status)=>create(<Player {...{policy,...handlers,...element.props, ...props}}/>,{durationMillis,...status})
            const current=()=>player.root.findByType(Subtitle).props.i
            beforeEach(()=>{
                ;({player, updateStatus,media, status}=create0());
                expect(current()).toBe(-1)
            })

            it("should locate nth for positionMillis",()=>{
                expect(cues[0].time>0).toBe(true)
                expect(current()).toBe(-1)

                act(()=>updateStatus({positionMillis:cues[0].time+progressUpdateIntervalMillis}))
                expect(current()).toBe(0)
                
                act(()=>updateStatus({positionMillis:cues[1].time+progressUpdateIntervalMillis}))
                expect(current()).toBe(1)

                act(()=>updateStatus({positionMillis:cues[2].time+progressUpdateIntervalMillis}))
                expect(current()).toBe(2)
            })

            it("should stop after the last",()=>{
                act(()=>updateStatus({positionMillis:cues[2].time+progressUpdateIntervalMillis}))
                expect(current()).toBe(2)

                act(()=>updateStatus({positionMillis:cues[2].end}))
                expect(current()).toBe(2)

                act(()=>{
                    updateStatus({positionMillis:cues[2].end+progressUpdateIntervalMillis})
                    jest.runOnlyPendingTimers()
                })
                expect(current()).toBe(0)
                expect(status().isPlaying).toBe(false)//and stopped
            })

            describe("whitespace=2",()=>{
                let player, updateStatus, status;
                const current=()=>player.root.findByType(Subtitle).props.i
                const isWhitespacing=()=>{
                    try{
                        const {status:{whitespace, whitespacing}}=player.root.findByType(NavBar).props
                        return !!whitespace && !!whitespacing
                    }catch(e){
                        return false
                    }
                }
                beforeEach(()=>{
                    handlers.onRecordChunkUri=()=>"/var/app/hello.wav"
                    ;({player, updateStatus, status}=create0({policy:{...policy,whitespace:2}}));
                    expect(current()).toBe(-1)
                    act(()=>{
                        debugger
                        updateStatus({positionMillis:transcript[0].cues[0].time+progressUpdateIntervalMillis})
                        jest.runOnlyPendingTimers()
                    })
                    expect(current()).toBe(0)
                })

                it("should whitespace when after 1st",()=>{
                    act(()=>updateStatus({positionMillis:transcript[0].cues[0].end+progressUpdateIntervalMillis}))//whitespace/start
                    expect(current()).toBe(0)
                    expect(isWhitespacing()).toBe(true)
                    act(()=>jest.runOnlyPendingTimers())//whitespacing/end
                    expect(isWhitespacing()).toBe(false)
                    expect(current()).toBe(1)
                })

                it("should not whitespace when jump from 0 to 2",()=>{
                    act(()=>updateStatus({positionMillis:transcript[0].cues[2].time+progressUpdateIntervalMillis}))
                    expect(current()).toBe(2)
                    expect(isWhitespacing()).toBe(false)
                })

                it("should have whitespace for last chunk, and then stop at 0",()=>{
                    act(()=>updateStatus({positionMillis:transcript[0].cues[2].time+progressUpdateIntervalMillis}))
                    expect(current()).toBe(2)

                    act(()=>updateStatus({positionMillis:transcript[0].cues[2].end+progressUpdateIntervalMillis}))
                    expect(current()).toBe(2)
                    expect(isWhitespacing()).toBe(true)
                    act(()=>jest.runOnlyPendingTimers())//whitespacing/end
                    expect(isWhitespacing()).toBe(false)
                    expect(current()).toBe(0)

                    expect(status().isPlaying).toBe(false)
                })   
            })

            it("should always show subtitle control(since recorder/recognizer is in it)",()=>{
                const {player,updateStatus}=create0({policy:{...policy,caption:false}})
                const current=()=>player.root.findByType(Subtitle).props.i
                expect(()=>player.root.findByType(Subtitle)).not.toThrow()
                act(()=>updateStatus({positionMillis:transcript[0].cues[1].time+progressUpdateIntervalMillis}))
                expect(current()).toBe(1)
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
                act(()=>updateStatus({positionMillis:cue.time+progressUpdateIntervalMillis}))
                expect(player.root.findByType(Subtitle).props.title).toBe(cue.text)
            })

            it("should delay subtitle when captionDelay",()=>{
                const {player,updateStatus}=create0({policy:{...policy,captionDelay:2}})
                const cue=transcript[0].cues[1]
                act(()=>updateStatus({positionMillis:cue.time+progressUpdateIntervalMillis}))
                expect(setTimeout.mock.calls.findIndex(a=>a[1]==2*1000)).not.toBe(-1)
            })

            it("should play 1,2,3 in order when there's no whitespace",()=>{
                transcript[0].cues.forEach((cue,i)=>{
                    act(()=>updateStatus({positionMillis:cue.time+progressUpdateIntervalMillis}))
                    expect(current()).toBe(i)
                })
            })

            xit("should trigger onFinish only when all cues are played",()=>{
                handlers.onFinish.mockClear()
                act(()=>{
                    global.setTimeout.mockClear()
                    updateStatus({positionMillis:durationMillis, didJustFinish:true})
                    jest.runOnlyPendingTimers()
                    debugger
                })
                expect(handlers.onFinish).toHaveBeenCalledTimes(1)
            })

            it("should play prev chunk when prev is pressed",()=>{
                act(()=>updateStatus({positionMillis:transcript[0].cues[1].time+progressUpdateIntervalMillis}))
                expect(current()).toBe(1)
                
                act(()=>{
                    player.root.findByProps({testID:"prev"}).props.onPress()
                    jest.runOnlyPendingTimers()
                })

                expect(current()).toBe(0)
            })

        })
    })

    describe("list media",()=>{
        class TestListMedia extends ListMedia{
            createTranscript(){
                return [{text:"hello"},{text:"world"}]
            }
        }

        it("should generate cue time and end",()=>{
            const {media:{instance:{cues}}}=create(<Player media={<TestListMedia shouldPlay={true}/>}/>)
            expect(cues.length).toBe(2)
            expect(cues.findIndex(a=>!(a.time && a.end))).toBe(-1)
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
                expect(lastCall).toMatchObject({type:"talk/toggle",talk:{id:"number_1_10_5"}, payload:{source, shadowing:{}}})
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
        
        fit("should generate 4 numbers for (0,10,4)",()=>{
            const {media}=create(<Player media={<NumberMedia shouldPlay={true} source="0,10,4"/>}/>)
            const {cues}=media.instance
            expect(cues.length).toBe(4)
            expect(cues.findIndex(a=>parseInt(a.text)<0 || parseInt(a.text)>10)).toBe(-1)
        })
    })

    describe("audiobook: a list of audio clips recorded",()=>{
        let player, updateStatus, testID, media
        const audios=[
            {uri:"1",text:"hello",duration:1000},
            {uri:"2",text:"hello",duration:2000}
        ]
        const current=()=>player.root.findByType(Subtitle).props.i
        
        beforeEach(()=>{
            selectBook.mockReturnValue(audios)
            ;({player,updateStatus,testID, media}=create(<Player media={<AudioBook shouldPlay={true}/>}/>));
            expect(media.instance.cues.length).toBe(2)
        })

        it("should play audio ",()=>{
            act(()=>updateStatus({positionMillis:media.instance.cues[0].time+progressUpdateIntervalMillis}))
            expect(current()).toBe(0)
            expect(testID("next").props.disabled).not.toBe(true)
            expect(()=>player.root.findByType(PlaySound)).not.toThrow()
        })
    })

    it("PictureBook should show picture for a while",()=>{
        selectBook.mockReturnValue([
            {uri:"1",text:"hello"},
            {uri:"2",text:"hello"}
        ])
        const {media, updateStatus}=create(<Player media={<PictureBook shouldPlay={true}/>}/>)
        act(()=>updateStatus({positionMillis:media.instance.cues[1].time}))
        expect(media.instance.state.i).toBe(1)
        expect(()=>media.findByType(Image)).not.toThrow()
    })
})

describe("talk",()=>{
    it("should clear all policy history when pressing clear",()=>{

    })

    it("should clear talk's history when long pressing clear",()=>{
        
    })
})