
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, View , ActivityIndicator, Text, TextInput, Pressable, Modal } from 'react-native';
import { GiftedChat, MessageText } from 'react-native-gifted-chat';
import { ChatGptProvider, useChatGpt } from "react-native-chatgpt";
import { MaterialIcons } from '@expo/vector-icons';
import { Speak, Recognizer, PressableIcon, Recorder, PlaySound, FlyMessage, useLatest, useStateAndLatest } from "../components"
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useNavigate } from 'react-router-native';
import * as FileSystem from "expo-file-system"
import { useKeepAwake } from "expo-keep-awake"

const defaultProps={
	isMedia:false,
	id: "chat",
	slug: "chat",
	title: "Chat Bot",
	thumb: require("../../assets/widget-chat-bot.png"),
	description: "Make a conversation with bot",
}
export default Object.assign(({})=>{
	useKeepAwake()
	React.useEffect(()=>()=>Speak.stop(),[])
	return (<ChatGptProvider><Navigator/></ChatGptProvider>)
},{defaultProps})

function Navigator({}){
		const {status, login}=useChatGpt()
		
		if (status === 'initializing') return null;

		if (status === 'logged-out' || status === 'getting_auth_token') {
			return (
				<View style={{ flex: 1 }}>
					<Button title="Login" onPress={login}/>
					{status === 'getting_auth_token' && (
						<View style={{flex:1, justifyContent:"center", padding:32, alignItems: 'center',    backgroundColor: 'rgba(0, 0, 0, 0.5)'}}>
							<ActivityIndicator size="large" color="white" />
						</View>
					)}
				</View>
			);
		}
	
		return <Chat />;
}

const CHAT_GPT_ID = 'system';
const Icons={system:"adb", assistant:"ac-unit", user:"emoji-people"}
const user=Object.freeze({_id: "user", name:"You"})

const createBotMessage = Object.assign((text) => {
	return {
		_id: String(Date.now()),
		text,
		createdAt: new Date(),
		user: {
			_id: CHAT_GPT_ID,
			name: 'react-native-chatgpt',
		}
	};
},{
	is(message, expectedText){
		if(message && message.user._id === CHAT_GPT_ID){
			if(expectedText){
				return message.text === expectedText
			}
			return true
		}
		return false
	}
})

const createDialogMessage=Object.assign(props=>{
	return {
		...createBotMessage(<Recognizer {...props}/>),
		user
	}
},{
	is:message=>message && !createBotMessage.is(message) && React.isValidElement(message.text) && message.text.type==Recognizer,
	changeLocale({locale, message,setMessages}){
		if(createDialogMessage.is(message)){
			message.text=React.cloneElement(message.text,{locale, key:locale})
			setMessages(prevs=>prevs[0]==message ? [...prevs] : prevs)
		}
	}
})

const createPromptMessage=Object.assign(props=>{
		return {
			...createBotMessage(<PromptMessage {...props}/>),
			user
		}
	},{
	is(message){
		if(message && React.isValidElement(message.text) && message.text.type==PromptMessage)
			return message.text.props.prompt
	},
	submitParams({message, params, setMessages,store}){
		const {prompt}=message.text.props
		message.text=React.cloneElement(message.text, {prompt:{...prompt,params, settled:prompt.prompt(params,store)}})
		setMessages(prevs=>prevs[0]==message ? [createBotMessage("..."),...prevs] : prevs)
	}
})

function isTextMessage(message){
	return typeof(message.text)!=="object"
}

/**
 * 1. auto append (...) only when last message is text
 * 2. 
 * @returns 
 */
const Chat = () => {
	const { sendMessage } = useChatGpt();
	const talk=useSelector(state=>state.talks.chat)
	const [messages=[], setMessages] = useState(()=>talk?.messages);
	const [audioInput, setAudioInput, $audioInput]=useStateAndLatest(false)
	const store=useStore()
	const dispatch = useDispatch()
	const navigate=useNavigate()
	const onSend = useCallback((msgs = []) =>setMessages((previousMessages) =>GiftedChat.append(previousMessages, msgs)), [])

	const options=useRef()

	const $messages=useLatest(messages)
	useEffect(()=>()=>{
		dispatch({type:"talk/toggle", talk:{
			...defaultProps, 
			messages:$messages.current.map(a=>{
				a.speak?.cancel()
				delete a.speak
				if(typeof(a.text)!="object"){
					return a
				}

				if(createDialogMessage.is(a))
					return 
				
				return {...a, text:`#${createPromptMessage.is(a)?.label}(...)`}
			}).filter(a=>!!a)
		}})
	},[])

	useEffect(() => {
		const lastMessage = messages[0]
		if(!lastMessage){
			setMessages([createBotMessage('Ask me anything :)')]);
		}else if (createBotMessage.is(lastMessage, "...")) {
			const current=messages[1], isPrompt=createPromptMessage.is(current)
			const speak=(!!$audioInput.current && isPrompt?.speakable!==false) ? Speak.session(voice) : null
			sendMessage({
				options:options.current,
				message:isPrompt?.settled.replace(/\s+/g," ") || current.text,
				onAccumulatedResponse: ({messageId, conversationId, message,isDone}) => {
					options.current={messageId, conversationId}
					// Attach to last message
					setMessages(([placeholder, ...prevs]) => {
						if(prevs[0]==current){
							placeholder = {
								...placeholder,
								text: speak ? message : (placeholder.text||"receiving data ")+".",
								...(dialog ? {audio:true, speak} : {})
							}

							if(isDone){
								speak?.stop?.(message,()=>{
									delete placeholder?.speak
									dialog && listenDialog()
								})
								if(isPrompt?.onSuccess){
									placeholder.text=isPrompt.onSuccess({...isPrompt, response:message, dispatch})
								}
								delete isPrompt?.onSuccess
								delete isPrompt?.prompt
							}else{
								speak?.(message)
							}
							
							return [placeholder, ...prevs]
						}
					});
				},
				onError: (e) => {
					FlyMessage.show(`${e.statusCode} ${e.message}`);
					setMessages((previousMessages) => {
						const newMessages = [...previousMessages];
						newMessages[0] = {
							...previousMessages[0],
							text: "Sorry, I couldn't process your request right now.",
						};
						return newMessages;
					});
				},
			});
		}else if(!createBotMessage.is(lastMessage) && typeof(lastMessage.text)!="object"){
			setMessages((prevMessages) => [createBotMessage('...'), ...prevMessages]);
		}
	}, [messages]);

	const {lang,mylang=lang, tts={}}=useSelector(state=>state.my)
	const [locale, setLocale]=React.useState(false)
	React.useEffect(()=>{
		Speak.setDefaults({lang: locale ? mylang : lang})
		createDialogMessage.changeLocale({locale, setMessages, message:messages[0]})
		return ()=>Speak.setDefaults({lang})
	},[locale])
	const voice=tts[locale ? mylang : lang]

	const [dialog, setDialog]=React.useState(false)
	const listenDialog=React.useCallback(()=>{
		onSend([
			createDialogMessage({
				autoSubmit:3000,
				locale,
				style:{color:undefined,padding:4},
				onAutoSubmit:record=>{
					setMessages(([last, ...prevs]) =>{
						if(createDialogMessage.is(last)){
							last.text=record.recognized
							last.audio=record.uri
							return [last, ...prevs]
						}
					})
				},
				uri:`${FileSystem.documentDirectory}chat/${Date.now()}.wav`
			})
		])
	},[onSend,locale])

	useEffect(()=>{
		if(dialog){
			if(createBotMessage.is(messages[0])){
				listenDialog()
			}
		}else if(createDialogMessage.is(messages[0])){
			setMessages(([listening, ...prevs])=>prevs)
		}
	},[dialog])

	const clearDialog=React.useCallback((needSaveToDialog)=>{
		if($messages.current.length<2){
			return 
		}
		setMessages(()=>[])
		if(!needSaveToDialog){
			return
		}
		const messages=$messages.current.map((message,i)=>{
			if(createDialogMessage.is(message))
				return 
			let {text, audio, user:{_id}}=message
			text=createPromptMessage.is(message)?.settled||text
			return typeof(audio)=="string" ? {user:_id, text, audio} : `${_id}:${text}`
		}).filter(a=>!!a).reverse()
		if(messages.length % 2){
			messages.shift()
		}
		globalThis.Widgets.dialog.create({
			title:`Chat`,
			dialog:messages,
		}, dispatch)
		FlyMessage.show("saved to dialog book!")
	},[])
	
	return (
		<View style={{flex:1}}>
			<GiftedChat
				user={user}
				messages={messages}
				onSend={onSend}
				alignTop={true}
				renderAvatarOnTop={true}
				parsePatterns={linkStyle=>[{
					style:linkStyle, 
					pattern:/@#(\w+)/,
					onPress(text){//check id patter in Media.create
						const [id]=/\d+/.exec(text)
						const slug=text.substring(2).replace(id,"")
						navigate(`/talk/${slug}/shadowing/${slug}${id}`)
					}
				}]}
				showUserAvatar={true}
				showAvatarForEveryMessage={true}
				renderAvatar={({currentMessage:{user}})=><Avatar user={user}/>}
				renderComposer={({onSend,...data})=><MessageComposer 
						locale={{locale, toggle:()=>setLocale(!locale), lang: locale ? mylang : lang}}
						submit={message=>message && onSend(message)}
						ask={params=>{
							createPromptMessage.submitParams({params, message: messages[0], setMessages, store})
						}}	
						forget={()=>setMessages(([current, ...prevMessages]) =>[...prevMessages])}
						{...{setDialog, clearDialog, setAudioInput, audioInput}}
					/>
				}
				renderMessageText={props=>{
					const {currentMessage:{text,audio}}=props
					if(React.isValidElement(text)){
						return text
					}
					
					if(isTextMessage(props.currentMessage) && audio==true){
						return null
					}

					return <MessageText {...props}/>
				}}

				renderMessageAudio={props=><PlayAudioMessage {...props} setMessages={setMessages}/>}

			/>
			<Text>{errorMessage}</Text>
		</View>
	);
}

function PlayAudioMessage({currentMessage, setMessages}){
	const [playing, setPlaying]=React.useState(false)
	return <PressableIcon name={playing ? "stop" : "multitrack-audio"}
		onPress={e=>{
			if(currentMessage.audio===true){
				currentMessage?.speak?.cancel()
				setMessages(prev=>{
					const i=prev.indexOf(currentMessage)
					if(i!=-1){
						const newMessages=[...prev]
						const current=newMessages[i]={...newMessages[i]}
						delete current.audio
						delete current.speak
						return newMessages
					}
				})
			}else{
				setPlaying(true)
				PlaySound.play(currentMessage.audio,()=>setPlaying(false))
			}
		}}/>
}

function Avatar({user}){
	return <MaterialIcons name={Icons[user._id]} size={30} style={{backgroundColor:"black", borderRadius:4,marginRight:4}} />
}

function MessageComposer({submit, ask, forget, setDialog, locale, clearDialog, audioInput, setAudioInput}){
	const [actions, setActions]=useState(false)
	const props={
		submit,
		textStyle:{borderRadius:2, flex:1,backgroundColor:"darkgray",height:"100%",color:"black"},
	}

	const askRef=React.useRef(ask)
	askRef.current=ask

	const prompts=React.useMemo(()=>{
		return Object.values(globalThis.Widgets).map(A=>A.prompts).filter(a=>!!a).flat().filter(a=>!!a && !!a.prompt)
	},[globalThis.Widgets])

	return (
		<View style={{width:"100%"}}>
			<View style={{
					flex:1, height:50, flexDirection:"row", padding:4,
					alignItems: 'center', justifyContent: 'center'
			}}>
					<PressableIcon name={audioInput ? "mic" : "keyboard"} 
						style={{width:50}} color={audioInput==2 ? "green" : "black"} size={36}
						onPress={()=>{
							setAudioInput(audioInput==2 ? true : !audioInput)
							setDialog(false)
						}}
						onLongPress={()=>{
							if(audioInput){
								setDialog(true)
								setAudioInput(2)
							}
						}}
						/>
					{audioInput && (
						<Pressable style={{width:50, flexDirection:"column",alignItems:"center", justifyContent:"center"}}  
							onPress={locale.toggle}>
							<Text style={{color:"black"}}>{locale.lang.split("-")[0]}</Text>
						</Pressable>
					)}

					{audioInput ? <InputAudio {...props} autoSubmit={audioInput==2} locale={locale.locale}/> : <InputText {...props}/> }

					<PressableIcon name="add-circle-outline" size={36} style={{marginLeft:10}} onPress={()=>setActions(!actions)}/>
					<PressableIcon name="delete-outline" size={36}  style={{}} onPress={clearDialog} onLongPress={e=>clearDialog(true)}/>
			</View>
			{actions && (
				<View style={{borderTopWidth:1, padding:5,width:"100%", flex:1, flexDirection:"row", flexWrap:"wrap", justifyContent:"space-around"}}>
					{prompts.map((prompt,i)=><PressableIcon key={i} {...prompt} size={50} labelStyle={{color:"black"}}
						onPress={()=>{
							submit(createPromptMessage({
								prompt,forget, 
								ask:params=>{
									if(prompt.settings?.dialog){
										setDialog(true)
										setAudioInput(2)
									}else if(prompt.settings?.dialog===false){
										setDialog(false)
										if(prompt.settings.audio){
											setAudioInput(true)
										}else if(prompt.settings.audio===false){
											setAudioInput(false)
										}
									}
									setTimeout(()=>askRef.current?.(params), 1000)	
								},
							}))
							setActions(false)
						}}
					/>)}
				</View>
			)}
		</View>
	)
}

const InputAudio=({submit, autoSubmit, textStyle, locale})=>{
	if(autoSubmit){
		return (
			<View style={{flex:1,alignItems:"center",justifyContent:"center", backgroundColor:"green"}}>
				<Recognizer.Wave style={{flex:1}}/>
			</View>
		)
	}
	return (
		<Recorder locale={locale}
			style={{...textStyle, justifyContent: 'center'}}
			onText={({recognized:text, uri:audio})=>{
				submit({text,audio})
			}}
			onRecord={({recognized:text, uri:audio})=>{
				submit({text,audio})
			}}
			onRecordUri={()=>`${FileSystem.documentDirectory}chat/${Date.now()}.wav`}
			>
			<Text style={{fontSize:16,color:"white"}}>Hold To Talk</Text>
		</Recorder>
	)
}

const InputText=({submit, textStyle})=>{
	const [value, setValue]=useState("")
	return (
			<TextInput 
				value={value}
				onChangeText={text=>setValue(text)}
				onSubmitEditing={e=>{
					if(value.trim().length){
						submit({text:value})
						setValue("")
					}
				}} 
				style={{...textStyle,padding:5,fontSize:16}}/>
	)
}

const PromptMessage=({ask, forget, prompt:{params, label, settled}})=>{
	const [values, setValues]=useState(params)
	const inputStyle={borderBottom:"1px dotted lightgray",margin:5,paddingLeft:5,flex:1}
	const paramsUI=React.useMemo(()=>{
		const ui=[]
		for (const key in params) {
			if (Object.hasOwnProperty.call(params, key)) {
				const value = params[key];
				ui.push(
					<View style={{flex:1, flexDirection:"row", margin:5, borderBottomWidth:1, borderBottomColor:"gray",alignItems: 'baseline'}} key={key}>
						<Text style={{width:100, color:"yellow"}} textAlign="right">{key.toUpperCase()}</Text>
						{(()=>{
							if(typeof(value)!="object"){
								return <TextInput name={key} 
										disabled={!!settled}
										style={inputStyle}
										placeholder={key} 
										defaultValue={value}
										onEndEditing={({nativeEvent:{text}})=>setValues({...values, [key]:text})}/>
							}else{
								return React.cloneElement(value,{disabled:!!settled,setValue:value=>setValues({...values, [key]:value})})
							}
						})()}
					</View>
				)
			}
		}
		return ui
	},[!!settled])
	return (
		<View style={{width:250, border:"1px solid", borderRadius:5,padding:5}}>
			<View style={{flex:1, alignItems:"center"}}><Text style={{color:"white"}}>{label.toUpperCase()}</Text></View>
			<View style={{flex:1}}>
				{paramsUI}
				{!settled && <View style={{flex:1, flexDirection:"row"}}>
					<Pressable onPress={()=>ask(values)} style={{flex:1, alignItems:"center"}}>
						<Text  style={{color:"yellow",margin:5}}>SEND</Text>
					</Pressable>
					<Pressable onPress={()=>forget(values)} style={{flex:1, alignItems:"center"}}>
						<Text  style={{color:"yellow",margin:5}}>CANCEL</Text>
					</Pressable>
				</View>}
			</View>
		</View>
	)
}
