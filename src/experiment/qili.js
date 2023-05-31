import * as FileSystem from "expo-file-system"

export default class {
    constructor({
        headers, 
        service="http://localhost:9080/1/graphql", 
        storage=service, //"https://up.qbox.me"
    }={}){
        this.service=service
        this.storage=storage
        this.headers=headers
    }

    static isTedBanned({getState}){
        return !getState().my.admin
    }

    static create({getState}){
        return new this()
    }

    async fetch(request){
        const {service, headers}=this
        const res=await fetch(service, {
            method:"POST",
            headers:{
                'content-type': 'application/json',
                "x-application-id":"parrot",
                ...headers,
            },
            body:(request.variables||request.query) ? JSON.stringify(request) : request
        })
        const {data}=await res.json()

        if(!data){
            throw new Error(res.statusText)
        }

        if(data.errors){
            throw new Error(data.errors.map(a=>a.message).join("\n"))
        }
            
        return data
    }

    async upload({file, key, host}){
        const {token:{token}}=await this.fetch({
            query:`query file_token_Query($key:String){
                token:file_upload_token(key: $key){
                    _id: id
                    token
                }
            }`,
            variables:{key}
        })

        const formData=new FormData()
        Object.keys({
            "x:id":host,token,key,
            file: {
                type:"video/mpeg",
                uri:file,
                name:"video.mp4"
            }
        }).forEach((a,i,self)=>formData.append(a,self[a]))

        return `${this.service.replace("graphql","parrot")}/static/${key}`

        const res=await fetch(this.storage,{
            method:"POST",
            headers:{
                ...this.headers, 
                'content-type': 'multipart/form-data',
            },
            body:formData
        })

        const {data}=await res.json()

        if(!data){
            throw new Error(res.statusText)
        }

        if(data.errors){
            throw new Error(data.errors.map(a=>a.message).join("\n"))
        }

        return data?.file_create?.url
    }
}