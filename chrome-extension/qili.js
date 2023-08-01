const headers={
	"x-application-id":apiKey,
	"x-access-token":accessToken
}
const Qili={
	service:api||"https://api.qili2.com/1/graphql",
	apiKey,
	async fetch(request){
		const res=await fetch(this.service,{
			method:"post",
			headers:{
				'Content-Type': 'application/json',
				...headers
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
		const client=new SubscriptionClient(this.service.replace(/^http/, "ws"),{
			reconnect:true,
			connectionParams:{
				...headers,
				request:{
					id:request.id,
					variables: request.variables
				},
			},
			connectionCallback(error){
				if(error){
					console.error(`subscription failed: ${error.message}`)
					client.close()
				}
			}
		})

		const sub=client.request({query:"*",...request}).subscribe(
			function onNext(data){
				callback?.(data)
			},
			function onError(error){
				callback?.({data:{error}})
			}
		)
		
		return ()=>{
			sub.unsubscribe()
			client.close()
		}
	},
}

