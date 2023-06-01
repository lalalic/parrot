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

        const formData=new FormData()
        const props={
            "x:id":host,token,key,
            file: {
                type:"video/mpeg",
                uri:file,
                name:"video.mp4"
            },
            //local upload for testing
            id:"file_create_Mutation",
            variables:JSON.stringify({
                _id:key,
                host,
                mimeType:"video/mpeg"
            })
        }
        Object.keys(props).forEach(k=>formData.append(k,props[k]))

        //return `${this.service.replace("graphql","parrot")}/static/${key}`
        const headers={
            ...this.headers, 
            "x-application-id":"parrot",//local for testing
            "Content-Type":"multipart/form-data",
        }

        delete headers["Content-Type"]
        
        const res=await fetch(this.storage,{
            method:"POST",
            headers,
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