import * as FileSystem from "expo-file-system"

export default class {
    constructor({
        headers, 
        service="https://api.qili2.com/1/graphql",//"http://localhost:9080/1/graphql", 
        storage="https://up.qbox.me"
    }={}){
        this.service=service
        this.storage=storage
        this.headers=headers
    }

    static create({getState}){
        return new this()
    }

    async fetch(request){
        const {service, headers}=this
        const res=await fetch(service, {
            method:"POST",
            headers:{
                'Content-Type': 'application/json',
                "x-application-id":"parrot",
                ...headers,
            },
            body: request instanceof FormData ? request : JSON.stringify(request)
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
            id:"file_token_Query",
            variables:{key}
        })
        
        const res=await FileSystem.uploadAsync(this.storage, file, {
            uploadType:FileSystem.FileSystemUploadType.MULTIPART,
            fieldName:"file",
            parameters:{
                "x:id":host,
                token,key,
            }
        })
    
        const {data}=JSON.parse(res.body)

        if(!data){
            throw new Error(res.statusText)
        }

        if(data.errors){
            throw new Error(data.errors.map(a=>a.message).join("\n"))
        }

        return data?.file_create?.url
    }
}