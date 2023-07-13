import { diffScore } from "../src/experiment/diff"

describe("diff",()=>{
    test.each([
        ["hello", "hello", 100],
        ["hello world", "hello", 50],
        ["hello", "你好", 0]
    ])('diff(%s, %s)=%i', (text, recognized, expected)=>{
        expect(diffScore(text, recognized)).toBe(expected)
    })
})