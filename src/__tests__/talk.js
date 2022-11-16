import Talk from "../talk"

describe("talk",()=>{
    it("<Talk/>",()=>{
        expect(()=><Talk/>).not.toThrow()
    })
})