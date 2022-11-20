
jest.mock("react-router-native",()=>({
    ...jest.requireActual('react-router-native'),
    useParams:jest.fn(),
    useNavigate: jest.fn(),
    useLocation: jest.fn(),
    useSelector: jest.fn(),
}))
import React from "react"
import {act} from "react-test-renderer"
import { Video } from 'expo-av';
import Talk from "../talk"
import { useParams, useLocation, useSelector} from "react-router-native"
import {Ted} from "../store"
import "../widgets"
import { Widgets } from "../widgets"
import Talks from "../talks"
import {TalkThumb} from "../components"

describe("talk",()=>{
    describe("basic",()=>{
        it("<Talk/>",()=>{
            expect(()=><Talk/>).not.toThrow()
        })
    
        it("<Talk slug={ted talk}/>",()=>{
            let top
            const talk={slug:"ted_talk_slug"}
            useParams.mockReturnValueOnce(talk)
            Ted.useTalkQuery=jest.fn().mockReturnValue({data:talk})
            act(()=>top=render(<Talk/>))
            expect(()=>top.root.findByType(Video)).not.toThrow()
        })
        
        describe("widget",()=>{
            let top
            const widget={slug:"Hello"}
            const Widget=Widgets[widget.slug]=React.forwardRef((props, ref)=><div ref={ref}/>)
            Widget.Tags=jest.fn()
            beforeEach(()=>{
                useParams.mockReturnValue(widget)
                Ted.useTalkQuery=jest.fn().mockReturnValue({data:widget})
                act(()=>top=render(<Talk/>))
            })

            it("<Talk slug={widget talk}/>",()=>{
                expect(()=>top.root.findByType(Widget)).not.toThrow()
            })

            it("should create <slug.Tags/> ",()=>{
                expect(()=>top.root.findByType(Widget.Tags)).not.toThrow()
            })
        })
        
    })
    

    fdescribe("talks",()=>{
        let top, talks
        beforeEach(()=>{
            useLocation.mockReturnValue({})
            const initiate=jest.spyOn(Ted.endpoints.today,'initiate')
                .mockReturnValue(jest.fn())
            const select=jest.spyOn(Ted.endpoints.today,'select')
                .mockReturnValue(jest.fn().mockReturnValue({data:{talks:[{slug:"1"},{slug:"2"}],pages:1,page:1}}))
            act(()=>top=render(<Talks/>))
            expect(initiate).toHaveBeenCalled()
            expect(select).toHaveBeenCalled()
            expect(()=>talks=top.root.findByType(Talks)).not.toThrow()
            expect(top.root.findAllByType(TalkThumb).length).toBe(2)
        })

        it("search history should be applied",()=>{
            
        })

        it("should update list whenever search happens",()=>{
            
        })

        it("should get 1-X pages' data in list whenever show x page",()=>{

        })
    })
})