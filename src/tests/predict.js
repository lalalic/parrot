import VocabularyBook from "../widgets/vocabulary-book"
import {ask} from "react-native-use-qili/components/predict"

export default describe("predict",()=>{
    it("VocabularyBook.Vocabulary",async ()=>{
        const book=VocabularyBook.prompts.find(a=>a.label="Vocabulary")
        const params={amount:10, category:"software"}
        const my={lang:"en",mylang:"zh"}
        const question=book.prompt(params, {getState:()=>({my, talks:{}})})
        const response=await ask(question)
        expect(response).to.be.a("string")
        const data=VocabularyBook.parse(response)
        expect(data).to.be.an(Array)
        expect(data.length).to.be(params.amount)
    })

    it("VocabularyBook.Idioms",async ()=>{
        const book=VocabularyBook.prompts.find(a=>a.label="Idioms")
        const params={amount:10, category:"software"}
        const my={lang:"en",mylang:"zh"}
        const question=book.prompt(params, {getState:()=>({my, talks:{}})})
        const response=await ask(question)
        expect(response).to.be.a("string")
        const data=VocabularyBook.parse(JSON.parse(response.replace(/\"idiom\"\:/g, '"text":').replace(/\"translation\"\:/,'"translated":')))
        expect(data).to.be.an(Array)
        expect(data.length).to.be(params.amount)
    })
})