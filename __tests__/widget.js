jest.mock("react-native-chatgpt")

import React from "react"
import VocabularyBook from "../src/widgets/vocabulary-book"
import Chat from "../src/widgets/chat"

fdescribe("chat",()=>{

    it("should init without error",()=>{
        expect(()=>render(<Chat/>)).not.toThrow()
    })
})

describe("vocabulary book",()=>{
    it("should create",()=>{
        expect(()=>render(<VocabularyBook/>)).not.toThrow()
    })

    it("should create a book when paste",()=>{
        
    })
})