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

        it("should pause and record after playing each chunk when policy has whitespace",()=>{
            return play({whitespace:1}).then(e=>{
                
            })
        })
    })

    describe("media",()=>{
        describe("positioning progress",()=>{
            it("should only position 1 when set position between 1.time and 1.end",()=>{
                
            })
        })
    })
})