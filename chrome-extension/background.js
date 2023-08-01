
class MultithreadQueue{
	then(task){
		task();
		return this
	}
}

class Service{
	constructor(props){
		Object.assign(this, props)
		this.sequence=props.multithread ? new MultithreadQueue() : Promise.resolve()
		this.stat={helps:0, errors:0}
		this.run(props)
		console.log(`service[${props.name}] started...`)
		if(props.url){
			const {url}=props
			function startTab() {
				chrome.tabs.query({url}, (tabs)=>{
					if(!tabs || !tabs[0]){
						chrome.tabs.create({ url});
					}
				})
				
			}
			chrome.runtime.onStartup.addListener(startTab)
			chrome.runtime.onInstalled.addListener(startTab)
		}
	}

	clear(){
		this.sequence=Promise.resolve()
	}
	
	run(props){
		
	}

	consume1(ask){

	}

	async handleResponse(response, ask){
		return response
	}

	enqueue(ask, done){
		const task=async ()=>{
			let timer
			try{
				timer=setTimeout(()=>{throw new Error("timeout")}, 60*1000)
				let response=await this.consume1(ask)
				response = await this.handleResponse(response, ask)
				done( response )
				this.stat.helps++
				console.debug({...ask, response})
				chrome.browserAction.setBadgeBackgroundColor({color:"#00FF00"})
			}catch(error){
				this.stat.errors++
				chrome.browserAction.setBadgeBackgroundColor({color:"#FF0000"})
				console.error({...ask, error})
			}finally{
				clearTimeout(timer)
			}
		}
		this.sequence=this.sequence.then(task, task)
		return this.sequence
	}

	async upload(dataURI, key=`$temp/1/${this.name}/${Date.now()}`){
		return (await this.batchUpload([dataURI],key))[0]
	}
	
	async batchUpload(images, rootKey=`$temp/1/${this.name}/${Date.now()}`){
		const {keys, querys, variables}=images.reduce((all, a,i)=>{
			const k=`key${i}`
			all.keys.push(k)
			all.querys.push(`
				token${i}:file_upload_token(key:$${k}){
					token
					key
				}
			`)
			all.variables[k]=`${rootKey}/${i}`
			return all
		},{keys:[],querys:[],variables:{}})

		const query=`query a(${keys.map(k=>`$${k}:String`).join(",")}){
			${querys.join("\n")}
		}`
		const data=await Qili.fetch({query,variables})

		const tokens=Object.values(data)
		return Promise.all(images.map(async (dataURI,i)=>{
			const form=new FormData()
			form.append('file', await (await fetch(dataURI)).blob())
			Object.entries(tokens[i]).forEach(([key, value])=>form.append(key, value))

			const res=await fetch("https://up.qbox.me",{
				method:"post",
				body:form
			})
			const {data}=await res.json()
			return data?.file_create?.url
		}))
	}
}

class WorkService extends Service{
	run({name, url, handleResponse}){
		const resultPs = {};
		this.consume1=function({message:{fnKey, args}, session}){
			resultPs[session] = (p => Object.assign(new Promise((resolve, reject) => Object.assign(p, { resolve, reject })), p))({});
			chrome.tabs.query({url}, function([activeTab]){
				if(activeTab){
					chrome.tabs.sendMessage(activeTab.id, {type:"fnCall", fnKey, args, session})
				}else{
					resultP.reject(new Error(`No tab for ${url}`))
				}
			})
			return resultPs[session]
		}

		this.bro=new Proxy(this,{
			get(target, fnKey){
				return (...args)=>target.consume1({fnKey, args})
			}
		})

		chrome.runtime.onMessage.addListener(function({event, data}, {tab}){
			if(tab.url!==url)
				return 
			if(event=="fnCall"){
				const { id, result }=data
				const p = resultPs[id];
                delete resultPs[id]
                p.resolve(result)
				return 
			}
			this[`on${event}`]?.(data)
			console.log({event, data, url, })
		})
	}
}

/** session need be kept if message.options */
class Chatgpt extends Service{
	run({helper}){
		const me=this
		const uid = () => {
			const generateNumber = (limit) => {
				const value = limit * Math.random();
				return value | 0;
			}
			const generateX = () => {
				const value = generateNumber(16);
				return value.toString(16);
			}
			const generateXes = (count) => {
				let result = '';
				for(let i = 0; i < count; ++i) {
					result += generateX();
				}
				return result;
			}
			const generateconstant = () => {
				const value = generateNumber(16);
				const constant =  (value & 0x3) | 0x8;
				return constant.toString(16);
			}
				
			const generate = () => {
						const result = generateXes(8)
								+ '-' + generateXes(4)
								+ '-' + '4' + generateXes(3)
								+ '-' + generateconstant() + generateXes(3)
								+ '-' + generateXes(12)
						return result;
			};
				return generate()
		};
		
		this.getToken=(()=>{
			let accessToken
			return async function getToken(){
				if(accessToken){
					return Promise.resolve(accessToken)
				}
				return new Promise(async (resolve, reject) => {
						const resp = await fetch("https://chat.openai.com/api/auth/session")
						if (resp.status === 403) {
								reject('CLOUDFLARE')
						}
						try {
								const data = await resp.json()
								if (!data.accessToken) {
										reject('ERROR')
								}
								resolve(accessToken=data.accessToken)
						} catch (err) {
								reject('ERROR')
						}
				})
			}
		})();
		
		async function getResponse(question, {messageId=uid(), conversationId}={}){
			const res = await fetch("https://chat.openai.com/backend-api/conversation", {
					method: "POST",
					headers: {
							"Content-Type": "application/json",
							"Authorization": "Bearer " + (await me.getToken()),
					},
					body: JSON.stringify({
							action: "next",
							messages: [
								{
									id: uid(),
									role: "user",
									content: {
										content_type: "text",
										parts: [question]
									}
								}
							],
							model: "text-davinci-002-render",
							...(conversationId? {conversation_id: conversationId} : {}),
							parent_message_id: messageId,
					})
			})
			return await read(res.body)
		}

		async function read1(answer){
			const resRead = answer.getReader()
			let datas=[]
			while (true) {
				const {done, value} = await resRead.read()
				if(done)
				if(value && value.length>20){//exclude 'data: [DONE]'
					datas.unshift(value)
					datas.splice(3)
				}

				if (done && datas.length){
					for(let data of datas){
						const raw=new TextDecoder().decode(data).split("data:").map(a=>a.trim()).filter(a=>!!a && a!='[DONE]')
						try{
							const piece=JSON.parse(raw[raw.length-1])
							if(piece.message?.content){
								return {
									message:piece.message.content.parts?.join(""), 
									messageId:piece.message.id, 
									conversationId:piece.conversation_id,
									error: piece.error||undefined
								}
							}
						}catch(error){
							console.error(`${error.message}\n${raw[raw.length-1]}`)
						}
					}
				}
			}
		}
		
		async function read(answer){
			const resRead = answer.getReader()
			while (true) {
				const {done, value} = await resRead.read()
				if (done) break
				const raw=new TextDecoder().decode(value).split("data:").filter(a=>!!a)
				for(let i=raw.length-1; i>-1; i--){
					try{
						const piece=JSON.parse(raw[i])
						if(piece.message.author.role=="assistant"){
							if(piece.message.status=="finished_successfully"){
								return {
									message:piece.message.content.parts.join(""), 
									messageId:piece.message.id, 
									conversationId:piece.conversation_id,
									error: piece.error||undefined
								}
							}
							break
						}
					}catch(e){

					}
				}
			}
			
			return {error:`unknown error`}
		}
		
		async function deleteConversation({conversationId}){

			const res=await fetch(`https://chat.openai.com/backend-api/conversation/${conversationId}`,{
				method:"PATCH",
				headers: {
						"Content-Type": "application/json",
						"Authorization": "Bearer " + (await me.getToken()),
				},
				body: JSON.stringify({
					is_visible:false
				})
			})
			await res.json()
		}

		function getOption(message){
			if(typeof(message)=="string" || !message.options)
				return 
			if(message.options.helper==helper){
				const {conversationId, messageId}=message.options
				return {conversationId, messageId}
			}
		}

		this.consume1=async function consume1({message}) {
			const response = await getResponse( message.message || message, getOption(message))
			
			if (!message.options) {
				if(response.conversationId){
					deleteConversation(response)
				}
				delete response.messageId;
				delete response.conversationId;
			}else{
				response.helper=helper
			}
			return response
		}
	}
}

async function subscribe({helper}, services){
	let helps=await new Promise((resolve)=>chrome.storage.sync.get('helps',data=>resolve(data ? data.helps||0 : 0)))
	await chrome.browserAction.setBadgeText({text:helps+""})
	await chrome.browserAction.setBadgeBackgroundColor({color:"#00FF00"})

	const answer=(ask, response)=>Qili.fetch({
		id:"answerHelp",
		query:`query($session:String!, $response:JSON!){
			answerHelp(session:$session, response:$response)
		}`,
		variables:{session:ask.session, response}
	})

	const unsub=Qili.subscribe({
		id:"helpQueue",
		query:`subscription($helper:String!){
				ask:helpQueue(helper:$helper)
		}`,
		variables:{helper}
	}, function onNext({data:{error, ask}}){//ask: {session, message}
		console.debug({...ask})
		const service=services[ask.message.$service||"chatgpt"]
		if(!service){
			console.error({ask, error:"No Service"})
			answer(ask, {})
			return 
		}
		chrome.storage.sync.set({ helps: ++helps });
		chrome.browserAction.setBadgeText({ text: helps + "" })
		chrome.browserAction.setBadgeBackgroundColor({color:"#0000FF"})

		service.enqueue(ask,response=>answer(ask, response))
	})

	chrome.runtime.onSuspend.addListener(unsub)

	console.log(`subscribed to ${Qili.apiKey} at ${Qili.service} as ${helper}\nlistening ....`)
}

subscribe({helper},window.bros={
	chatgpt:	new Chatgpt({
					helper,
					name:"chatgpt",
				}),
	diffusion:	new (class extends WorkService{
					run({}){
						super.run(...arguments)
						const service=diffusion()
						this.consume1=function({message:{args:[prompt]}}){
							return service.generate(prompt)
						}
					}
				})({
					helper,
					name:"diffusion",
					//url:"https://runwayml-stable-diffusion-v1-5.hf.space/",
					async handleResponse(images,ask){
						if(window.isLocal){
							return images
						}
						return await this.batchUpload(images, `temp/diffusion/${ask.session}`)
					}
				}),
	download: 	new (class extends WorkService{
					run({}){
						super.run(...arguments)
						this.consume1=async ({message:{args:[url]}})=>this.upload(url)
					}
				})({multithread:true})
})