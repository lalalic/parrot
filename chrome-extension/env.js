const token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NDkzM2M3MzQzMzIwMDAwMmY1NjAzYjIiLCJpYXQiOjE2ODgxMzczOTUsImV4cCI6MTcxOTY5NDk5NX0.BjxVhLbe8N-LoArYq--56DwlHICvs87WhTj0re46x4M"
const helper="admin"
const url="https://api.qili2.com/1/graphql"
const Qili={
	async fetch(request){
		const res=await fetch(url,{
			method:"post",
			headers:{
				'Content-Type': 'application/json',
				"x-application-id":"parrot",
				"x-session-token":token
			},
			body:JSON.stringify(request)
		})
		const {data}= await res.json()
		if(!data){
            throw new Error(res.statusText)
        }

        if(data.errors){
            throw new Error(data.errors.map(a=>a.message).join("\n"))
        }
		return data
	},
	subscribe(request, callback){
		const {SubscriptionClient} = SubscriptionsTransportWs
		//@Why: a shared client can't work, is it because close method is changed ???
		const client=new SubscriptionClient(url.replace(/^http/, "ws"),{
			reconnect:true,
			connectionParams:{
				"x-application-id":"parrot",
				//"x-session-token":token,
				request:{
					id:request.id,
					variables: request.variables
				},
			},
			connectionCallback(errors){
				if(errors){
					callback?.({errors})
				}
			}
		})

		const sub=client.request({query:"*",...request}).subscribe(
			function onNext(data){
				callback?.(data)
			},
			function onError(errors){
				callback?.({data:{errors}})
			}
		)
		
		return ()=>{
			sub.unsubscribe()
			client.close()
		}
	},
	
}

