const fetch=require("node-fetch2")
function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

function clean(ob){
    Object.keys(ob).forEach(k=>!ob[k] && (delete ob[k]))
    return ob
}

function parse(input){
    return input.split(/[\n;]/).filter(a=>!!a)
        .map(a=>{
            a=a.replace(/^\d+\.\s+/, "").trim()
            let pronunciation, translated;
            a=a.replace(/\[(?<pronunciation>.*)\]/,(a,p1)=>{
                pronunciation=p1.trim()
                return ""
            }).trim();
            a=a.replace(/[\(（](?<translated>.*)[\)）]/,(a,p1)=>{
                translated=p1.trim()
                return ""
            }).trim()
            if(a){
                return clean({text:a, pronunciation, translated})
            }
        }).filter(a=>!!a)
}



const uploader={
    vocabulary(){
        console.log('kick off english vocabulary')
        const cheerio = require("cheerio")
        const Vocabulary=["cet4","cet6","toefl","ielts","gmat","gre","sat","common"]
        const pattern = /(\w+)\s+\[([^\]]+)\]\s*–\s*(\w+)\.\s*(.*?)\s*:\s*(.*)/;
            
        async function getVocabulary(cat){
            const url=`https://vocabularyshop.com/${cat}-vocabulary-words/`
            console.log(`getting data for ${cat} from ${url}`)
            const res=await fetch(url)
            const data=await res.text()
            const $=cheerio.load(data)
            const ps=Array.from($('.entry-content>p'))
            const i=(i=>ps.findIndex((a,k)=>k>i && $(a).text()!="&nbsp;"))(ps.findIndex(a=>$(a).text()=="&nbsp;"))
            ps.splice(0,i)
            const words=ps.map(a=>{
                const text=$(a).text()
                const [,word, pronunciation, classification, explanation ] = text.match(pattern)||[]
                if(word){
                    return {text:word, pronunciation, classification, explanation}
                }
            }).filter(a=>!!a)
            return words
        }

        async function getVocabularyFromFile(cat, root){
            const fs=require('fs')
            const files=fs.readdirSync(root)
            return files.filter(a=>a.startsWith(`${cat}-`))
                .map(file=>fs.readFileSync(`${root}/${file}`))
                .map(list=>JSON.parse(list))
                .flat()
        }

        Vocabulary.forEach(async cat=>{
            const words=shuffleArray(await getVocabularyFromFile(cat, `${__dirname}/../resources/vocabulary`))
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

    async file(file){
        file=require('path').resolve(file)
        const data=require('fs').readFileSync(file, "utf-8")
        const title=file.split("/").pop().split(".")[0]
        const chunks=shuffleArray(data.split("\n").map(a=>a.trim()).filter(a=>!!a).map(parse).flat())
        const talk={
            _id:`vocabulary-${Date.now()}`,
            slug:"vocabulary",
            lang:"en",
            isWidget:true,
            title,
            data:chunks,
        }
        await upload(talk)
        console.log(`uploaded ${talk.title} to qili cloud`)
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
            "x-session-token": 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NTQ0ZjZjNTY0ZmZlOTQyZmY1ZGM3OTUiLCJpYXQiOjE3MTU3OTY2NzAsImV4cCI6MTc0NzM1NDI3MH0.3wshjwyhpAsodBdRm5Adosa4Z_wfCm-5291jdBnxRG4',
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

const [,,type='vocabulary',i]=process.argv
uploader[type](i)

