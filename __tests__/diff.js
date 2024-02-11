import { diffScore } from "../src/experiment/diff"

describe("diff",()=>{
    test.each([
        ["hello", "hello", 100, {}],
        ["hello world", "hello", 50, {}],
        ["hello, world!", "hello", 50, {}],
        ["hello..., world!", "hello", 50, {}],
        ["hello", "你好", 0, {}],
        ///***lang=zh */
        ["你好","你好",100,{lang:"zh"}],
        ["你 好!","你好",100,{lang:"zh"}],
        ["你(好)","你好",100,{lang:"zh"}],
        ["你好,hello world","你好hello world",100,{lang:"zh"}],
        //corner cases
        [undefined, "good",110,{}],
        ["good", null,10,{}],
    ])('diff(%s, %s)=%i', (text, recognized, expected,data)=>{
        expect(diffScore(text, recognized, data)).toBe(expected)
    })
})