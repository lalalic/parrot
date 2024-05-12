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


import { getSession } from "react-native-use-qili/store"
async function ask(message, chatflow, timeout=60*1000){
    if(typeof(message)=="string"){
        message={question:message}
    }

    if(typeof(chatflow)==="number"){
        timeout=chatflow
    }

    if(!chatflow){
        chatflow=globalThis.QiliConf.chatflow
    }

    const control=new AbortController()
    const timer=setTimeout(()=>control.abort(),timeout)
    try{
        const res=await fetch(`https://ai.qili2.com/api/v1/prediction/${chatflow}`,{
            signal: control.signal,
            method:"POST",
            headers:{
                "content-type":"application/json",
                ...getSession()
            },
            body:JSON.stringify(message)
        })
        if(!res.ok){
            control.abort()
            throw new Error(res.statusText)
        }
        const predict=await res.text()
        return predict
    }catch(e){
        return e.message
    }finally{
        clearTimeout(timer)
    }
}