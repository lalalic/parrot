const fetch=require("node-fetch2")

const uploader={
    vocabulary(){
        const cheerio = require("cheerio")
        const Vocabulary=["cet4","cet6","toefl","ielts","gmat","gre","sat","common"]
        const pattern = /(\w+)\s+\[([^\]]+)\]\s*–\s*(\w+)\.\s*(.*?)\s*:\s*(.*)/;
            
        async function getVocabulary(cat){
            const res=await fetch(`https://vocabularyshop.com/${cat}-vocabulary-words/`)
            const data=await res.text()
            const $=cheerio.load(data)
            const ps=Array.from($('.entry-content>p'))
            const i=(i=>ps.findIndex((a,k)=>k>i && $(a).text()!="&nbsp;"))(ps.findIndex(a=>$(a).text()=="&nbsp;"))
            ps.splice(0,i)
            const words=ps.map(a=>{
                const text=$(a).text()
                const [,word, pronunciation, classification, explanation, example ] = text.match(pattern)||[]
                if(word){
                    return {word, pronunciation, classification, explanation}
                }
            }).filter(a=>!!a)
            return words
        }

        Vocabulary.forEach(async cat=>{
            console.log('getting data for '+cat)
            const words=await getVocabulary(cat)
            const file=`${__dirname}/../resources/vocabulary/${cat}`
            let i=1, id=Date.now()
            while(words.length){
                const chunks=words.splice(0,1000)
                
                const talk={
                    _id:`vocabulary-${cat}${i}k`,
                    slug:"vocabulary",
                    lang:"en",
                    isWidget:true,
                    title:`${cat.toUpperCase()}-${i}k`,
                    data:chunks,
                }
                await upload(talk)
                console.log(`uploaded ${talk.title} to qili cloud`)
                i++
            }
        })
    },

    async builtin(i){
        const talks=[
            
        ]

        if(i!=undefined){
            await upload(talks[parseInt(i)])
            console.log(`uploaded ${talks[i].id}`)
            return 
        }

        talks.forEach(async a=>{
            await upload(a)
            console.log(`uploaded ${a.title}`)
        })
    },
}

async function upload(talk){
    const res=await fetch("https://api.qili2.com/1/graphql",{
        method:"POST",
        headers:{
            "x-application-id":"parrot",
            "x-session-token": 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NDdmNjlhYzM0NmZhMjAwMmY4MzU4NmMiLCJpYXQiOjE2ODY1MzcwNzQsImV4cCI6MTcxODA5NDY3NH0.iqxEgnJCP2_PbBCr1KZwAtUU6wdxl8FLmYuz70VHtJM',
            "content-type":"application/json",
        },
        body:JSON.stringify({
            id:`save`,
            variables:{talk}
        })
    })
    const data=await res.json()
    if(data.errors){
        throw new Error(data.errors.map(a=>a.message).join("\n"))
    }
    console.info(data)
}

const [,,type='$',i]=process.argv
uploader[type]?.(i)

