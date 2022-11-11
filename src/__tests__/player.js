describe("play features",()=>{
    describe("without transcript",()=>{
        it("should not show nav buttons, except play",()=>{

        })

        it("should not show record, video, caption, subtitle",()=>{

        })
    })

    describe("with transcript",()=>{
        const play=()=>{

        }

        describe("corresponding nav bar: or ignore action",()=>{
            it("should diable slow_prev, prev, next when only 1 cue",()=>{

            })
    
            it("should disable slow_prev, prev when current is first",()=>{
    
            })
    
            it("should disable next when current is last",()=>{
    
            })
        }).skip()

        it("should toggle record when pressiong record",()=>{

        })

        it("should play 1,2,3 in order when there's no whitespace",()=>{

        })

        it("should pause and record after playing each chunk when policy has whitespace",()=>{
            
        })

        it("should only rerender progress bar when status is not changed although media position changed",()=>{

        })

        it("should trigger onFinish only when all cues are played",()=>{

        })

        describe("number media",()=>{
            it("should be allowed to control whitespace",()=>{

            })

            it("should only position 1 when set position between 1.time and 1.end",()=>{
                
            })
        })
    })
})