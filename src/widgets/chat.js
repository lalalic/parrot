
import React, { useCallback, useEffect, useState } from 'react';
import { View , Text, TextInput, Pressable, ActivityIndicator} from 'react-native';
import { GiftedChat, MessageText } from 'react-native-gifted-chat';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { KeyboardAvoidingView} from "../components"
import Recorder from '../components/Recorder';
import Recognizer from '../components/Recognizer';
import FlyMessage from "react-native-use-qili/components/FlyMessage";
import PressableIcon from "react-native-use-qili/components/PressableIcon";
import {ask} from "react-native-use-qili/components/predict";
import useStateAndLatest from "react-native-use-qili/components/useStateAndLatest";
import { useDispatch, useSelector } from 'react-redux';
import * as FileSystem from "expo-file-system"
import { useKeepAwake } from "expo-keep-awake"
import chatAPI from '../components/chatAPI';
import PlaySound from '../components/PlaySound';
const l10n=globalThis.l10n

const defaultProps={
	isMedia:false,
	id: "chat",
	slug: "chat",
	title: "Chat",
	thumb: require("../../assets/widget-chat-bot.png"),
	description: "Make a conversation with bot",
}
export default Object.assign(props=>{
	useKeepAwake()
	return (<Chat/>)
},{defaultProps})

const CHAT_GPT_ID = 'system';
const Icons={system:"adb", assistant:"ac-unit", user:"emoji-people"}
const user=Object.freeze({_id: "user", name:"You"})
const DIALOG=2

const createBotMessage = Object.assign((text, props={}) => {
	return {
		_id: String(Date.now()),
		text,
		createdAt: new Date(),
		user: {
			_id: CHAT_GPT_ID,
			name: 'bot',
		},
		...props
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

/** a type of user message to listen */
const createDialogMessage=Object.assign(({setMessages, ...props})=>{
	return {
		...createBotMessage(
			<Recognizer autoSubmit={3000}
				style={{color:undefined,padding:4}} 
				uri={`${FileSystem.documentDirectory}chat/${Date.now()}.wav`}
				onAutoSubmit={record=>{
					setMessages(messages =>{
						const [last, ...prevs]=messages
						if(createDialogMessage.is(last)){
							last.text=record.recognized
							last.audio=record.uri
							return [last, ...prevs]
						}
						return messages
					})
				}}
				{...props}/>
		),
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

function isTextMessage(message){
	return typeof(message.text)!=="object"
}

/**
 * 1. auto append (...) only when last message is text
 * 2. 
 * @returns 
 */
const Chat = () => {
	const dispatch = useDispatch()
	const talk=useSelector(state=>state.talks[defaultProps.id])
	const [messages=[], setMessages, $messages] = useStateAndLatest(()=>talk?.messages);
	const [audioInput, setAudioInput]=useStateAndLatest(false)
	/************locale */
	const {lang,mylang=lang, tts={}}=useSelector(state=>state.my)
	const [locale, setLocale]=React.useState(false)
	React.useEffect(()=>{
		createDialogMessage.changeLocale({locale, setMessages, message:messages[0]})
	},[locale])
	const voice=tts[locale ? mylang : lang]
	/*************end locale */

	/**It's ok to change in place since it's called only when quit and clear dialog*/
	const trimMessages=React.useCallback(messages=>{
		return messages.map(a=>{
			delete a.pending

			if(createBotMessage.is(a,'...')){
				a.text="[Cancelled]"
			}

			if(typeof(a.text)=='string'){
				return a
			}
		}).filter(a=>!!a)
	},[])

	useEffect(()=>()=>{//clean messages when unmount	
		dispatch({type:"talk/set", talk:{
			...defaultProps, 
			messages:trimMessages($messages.current)
		}})
	},[])

	useEffect(() => {//trigger sending message
		const lastMessage = messages[0]
		if(!lastMessage){//empty 
			setMessages([createBotMessage(l10n['Ask me anything'])]);
		}else if (createBotMessage.is(lastMessage)) {//send chat message
			if(createBotMessage.is(lastMessage,"...")){
				const [,current, ...history]=messages
				ask({
					question:current.text,
					history: history.reverse().slice(1).map(a=>({message:a.text, type: a.user.name=="bot" ? "apiMessage" : "userMessage"})),
					overrideConfig:{
						switchAudio: audioInput ? {selectedOption: "OpenAITTS"} : ""
					}
				}).then(async answer=>{
					const audio = audioInput && chatAPI.audio(answer)
					const file=audio ? await audio?.file : null

					setMessages(([last, ...prevs])=>{
						const message={...last, text:answer}
						delete message.pending

						if(audio){
							message.audio=file
							message.text=audio.title
							PlaySound.play(file)
						}
						return [
							message,
							...prevs,
						]
					})
				})
			}else if(audioInput==DIALOG && typeof(lastMessage.text)=="string"){//already got response, and in dialog mode
				setMessages(prevs=>[
					createDialogMessage({locale, setMessages}),
					...prevs,
				])
			}
		}else {//user message
			if(!createDialogMessage.is(lastMessage)){//user just commit message
				const props={pending:true}
				setMessages((prevMessages) => [ 
					createBotMessage('...',props),
					...prevMessages
				]);//add trigger
			}else if(audioInput!=DIALOG){//dialog off, then remove last dialog message
				setMessages(([dialogMessage, ...prevs])=>prevs)
			}
		}
	}, [messages, audioInput, locale, voice]);

	const clearDialog=React.useCallback((needSaveToDialog)=>{
		if($messages.current.length<2){
			return 
		}
		setMessages(()=>[])

		dispatch({type:"talk/set", talk:{
			...defaultProps,
			messages:[]
		}})

		if(!needSaveToDialog){
			return
		}

		const messages=trimMessage($messages.current).reverse()
		messages.pop()//remove first bot message

		if(messages.length % 2){
			messages.shift()
		}
		const DialogBook=globalThis.Widgets.dialog
		DialogBook.create({
			title:`Chat on ${new Date().asDateTimeString()}`,
			data:DialogBook.parse(messages.join("\n")),
		}, dispatch)
		FlyMessage.show("saved to dialog book!")
	},[])

	const disabled=!!createBotMessage.is(messages[0],'...')
	
	return (
		<KeyboardAvoidingView style={{flex:1}} behavior="padding">
			<GiftedChat
				isKeyboardInternallyHandled={false}
				user={user}
				messages={messages}
				onSend={useCallback((msgs = []) =>setMessages(prevs =>GiftedChat.append(prevs, msgs)), [])}
				alignTop={true}
				renderAvatarOnTop={true}
				showUserAvatar={true}
				showAvatarForEveryMessage={true}
				renderAvatar={({currentMessage:{user}})=><Avatar user={user}/>}
				renderComposer={({onSend,...data})=><MessageComposer style={{flex:0, flexGrow:0, flexShrink:1, flexBasis:'auto'}}
					disabled={disabled}
					locale={{locale, toggle:()=>setLocale(!locale), lang: locale ? mylang : lang}}
					submit={message=>message && onSend(message)}
					{...{clearDialog, setAudioInput, audioInput}}
				/>}
				renderMessageText={props=>{
					const {currentMessage:{text, audio}}=props
					if(React.isValidElement(text)){
						return text
					}

					return <MessageText {...props}/>
				}}

				renderTicks={({ pending }) => {
					if (!pending) return null;
					return (
						<View pointerEvents="none" 
							style={{width:10, height:10, overflow:"hidden",marginRight:2}}>
							<ActivityIndicator 
								style={{width:"100%",height:"100%"}} 
								color="blue"/>
						</View>
					)
				}}

				renderMessageAudio={props=>{
					const {currentMessage:{audio}}=props
					return <PlaySound.Trigger audio={audio} />
					
				}}
			/>
		</KeyboardAvoidingView>
	);
}

function Avatar({user}){
	return <MaterialIcons name={Icons[user._id]} size={30} style={{backgroundColor:"black", borderRadius:4,marginRight:4}} />
}

function MessageComposer({submit, disabled, style, locale, clearDialog, audioInput, setAudioInput}){
	const props={
		submit,
		textStyle:{borderRadius:2, flex:1,backgroundColor:"darkgray",height:"100%",color:"black"},
	}

	return (
		<View style={[{width:"100%", minHeight:50},style, disabled ? {pointerEvents: 'none', opacity:0.5} : null]}>
			<View style={{
					flex:1, height:50, flexDirection:"row", padding:4,
					alignItems: 'center', justifyContent: 'center'
			}}>
				<PressableIcon name={audioInput ? "mic" : "keyboard"} 
					style={{width:50}} color={audioInput==2 ? "green" : "black"} size={36}
					onPress={()=>{
						setAudioInput(audioInput==2 ? true : !audioInput)
					}}
					onLongPress={()=>{
						if(audioInput){
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

				<PressableIcon name="delete-outline" size={36}  style={{}} onPress={e=>clearDialog(false)} onLongPress={e=>clearDialog(true)}/>
			</View>
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
			<TextInput enterKeyHint="send"
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
