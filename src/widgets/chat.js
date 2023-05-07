
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, View , ActivityIndicator, Text, TextInput, Pressable, Modal, TouchableWithoutFeedback } from 'react-native';
import { GiftedChat, MessageText } from 'react-native-gifted-chat';
import { ChatGptProvider, useChatGpt } from "react-native-chatgpt";
import { MaterialIcons } from '@expo/vector-icons';
import { Speak, Recognizer, PressableIcon, Recorder } from "../components"
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-native';


export default Object.assign(
		({})=><ChatGptProvider><Navigator/></ChatGptProvider>,
		{
				defaultProps: {
						isMedia:false,
						id: "chat",
						slug: "chat",
						title: "Make a conversation",
						thumb: require("../../assets/widget-picture-book.jpeg"),
						description: "Make a conversation with bot",
				}
		}
)

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

const createBotMessage = (text) => {
	return {
		_id: String(Date.now()),
		text,
		createdAt: new Date(),
		user: {
			_id: "system",
			name: 'react-native-chatgpt',
		}
	};
};

const Chat = () => {
	const { sendMessage } = useChatGpt();
	const [messages, setMessages] = useState([]);
	const [errorMessage, setErrorMessage] = useState('');
	const dispatch = useDispatch()
	const messageId = useRef('');
	const conversationId = useRef('');

	useEffect(() => {
		setMessages([createBotMessage('Ask me anything :)')]);
	}, []);

	useEffect(() => {
		if (messages.length) {
			const lastMessage = messages[0];
			if (!lastMessage || lastMessage.user._id === CHAT_GPT_ID) return;
			if(typeof lastMessage.text=="object") return 

			setMessages((prevMessages) => [createBotMessage('...'), ...prevMessages]);
		}
	}, [messages]);

	useEffect(() => {
		const lastMessage = messages[0];
		if (
			lastMessage &&
			lastMessage.user._id === CHAT_GPT_ID &&
			lastMessage.text === '...'
		) {
			const speak=async text=>{
				if(!speak.run){
					const [run, stop]=await Speak.prepare()
					speak.current=0
					speak.run=run
					speak.stop=(finalText)=>{
						speak.done=true
						speak(finalText)
					}
					speak.doStop=stop
				}
				speak.queue=text.split(/[\n\r\.\!]/g).filter(a=>!!a).slice(speak.current)
				if(!speak.running){
					speak.running=true
					while(speak.queue.length>1){
						await speak.run((speak.current++, speak.queue.pop()))
					}
					speak.running=false
					if(speak.done){
						await speak.run((speak.current++, speak.queue.pop()))
						speak.doStop()
					}
				}
			}
			const current=messages[1]
			const message=typeof(current?.text)=='object' ? current.text.prompt(current.text.params).replace(/\s+/g," ") : current?.text
			const options= messageId.current && conversationId.current && {messageId: messageId.current,conversationId: conversationId.current} || undefined
			sendMessage({
				message,
				options,
				onAccumulatedResponse: (accumulatedResponse) => {
					messageId.current = accumulatedResponse.messageId;
					conversationId.current = accumulatedResponse.conversationId;
					// Attach to last message
					setMessages((previousMessages) => {
						const newMessages = [...previousMessages];
						newMessages[0] = {
							...previousMessages[0],
							text: current.speakable!==false ? accumulatedResponse.message : (previousMessages[0].text||"receiving data ")+".",
						};
						if(current.speakable!==false){
							speak(accumulatedResponse.message)
						}

						if(accumulatedResponse.isDone){
							speak.stop(accumulatedResponse.message)
							if(current?.text.onSuccess){
								newMessages[0].text=current.text.onSuccess({...current.text, response:accumulatedResponse.message, dispatch})
							}
						}
						
						return newMessages;
					});
				},
				onError: (e) => {
					setErrorMessage(`${e.statusCode} ${e.message}`);
					setMessages((previousMessages) => {
						const newMessages = [...previousMessages];
						// @ts-ignore
						newMessages[0] = {
							...previousMessages[0],
							text: "Sorry, I couldn't process your request",
						};
						return newMessages;
					});
				},
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [messages]);

	const navigate=useNavigate()

	const onSend = useCallback((msgs = []) => {
		setMessages((previousMessages) =>GiftedChat.append(previousMessages, msgs))
	}, []);

	return (
		<View style={{flex:1}}>
			<GiftedChat
				messages={messages}
				onSend={onSend}
				user={{_id: "user"}}
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
				renderComposer={({onSend})=><MessageComposer submit={text=>text && onSend({text})}/>}
				renderMessageText={props=><MessageTextEx {...props} 
					submit={(params)=>{
						setMessages(([current, ...prevMessages]) =>{
							current.text={...current.text, params, settled:true}
							return [createBotMessage('...'), current, ...prevMessages]
						})
					}}
					cancel={()=>{
						setMessages(([current, ...prevMessages]) =>{
							return [...prevMessages]
						})
					}}
				/>}

			/>
			<Text>{errorMessage}</Text>
		</View>
	);
}

function Avatar({user}){
	return <MaterialIcons name={Icons[user._id]} size={30} style={{backgroundColor:"black", borderRadius:4,marginRight:4}} />
}

function MessageComposer({submit}){
	const [audioInput, setAudioInput]=useState(false)
	const [actions, setActions]=useState(false)
	const props={
			submit,
			textStyle:{borderRadius:2, flex:1,backgroundColor:"darkgray",height:"100%",color:"black"},
	}

	const prompts=React.useMemo(()=>{
		return Object.values(globalThis.Widgets).map(A=>A.prompts).filter(a=>!!a).flat().filter(a=>!!a && !!a.prompt)
	},[globalThis.Widgets])

	return (
		<View style={{width:"100%"}}>
			<View style={{
					flex:1, height:50, flexDirection:"row", padding:4,
					alignItems: 'center', justifyContent: 'center'
			}}>
					<Pressable onPress={()=>setAudioInput(!audioInput)}>
						<MaterialIcons name={audioInput ? "mic" : "keyboard"} style={{width:50}} color="black" size={36}/>
					</Pressable>
					{audioInput ? <InputAudio {...props}/> : <InputText {...props}/> }

					{!!prompts.length && <Pressable onPress={()=>setActions(!actions)}>
						<MaterialIcons name="add-circle-outline" size={32}/>
					</Pressable>}
			</View>
			{actions && <Actions {...{submit:text=>{submit(text);setActions(false)}, prompts}} />}
		</View>
	)
}

const InputAudio=({submit, textStyle})=>{
	const trigger=useRef()
	const [record, setRecord]=useState(null)
	const [status, setStatus]=useState("")
	const action=useCallback(type=>{
		trigger.current && trigger.current.props.onPressOut()
		if(record){
			switch(type){
				case "cancel":
					break
				case "text":
					submit(record.recognized)
					break
				case "audio":
					submit(record.recognized)
					break
			}
			setRecord(null)
			setStatus("")
		}
	},[])
	return (
		<Recorder 
			recording={false}
			style={{...textStyle, justifyContent: 'center'}}
			onRecordUri={()=>""}
			onRecord={record=>setRecord(record)}
			trigger={
				<TouchableWithoutFeedback ref={trigger} style={{flex:1,alignItems:"center"}}
					>
					<Text style={{flex:1,textAlign:"center",fontSize:16,color:"white"}}>Hold To Talk</Text>
				</TouchableWithoutFeedback>
			}>
			<Modal transparent={true}>
				<View style={{flex:1, flexDirection:"column", backgroundColor:"rgba(128,128,128,0.8)"}}>
					<View style={{flex:1}}/>
					<View style={{height:50, margin:10, alignItems:"center", flexDirection:"column"}}>
						<Recognizer.Text style={{flex:1, backgroundColor:"green", minWidth:200, borderRadius:5}} children="..."/>
					</View>
					<View style={{height:100, flexDirection:"row"}}>
						<PressableIcon name="cancel"  size={40} style={{flex:1}}
							color={status=="cancel" ? "red" : "white"}
							onPressIn={()=>setStatus("cancel")}
							onPressOut={()=>action("cancel")}  />
						
						<TouchableWithoutFeedback style={{flex:1}} onPressIn={()=>setStatus("text")}>
							<MaterialIcons name="textsms"  size={40} style={{flex:1}}
								color={status=="text" ? "red" : "white"}
								onPressIn={()=>setStatus("text")}
								onPressOut={()=>action("text")} />
						</TouchableWithoutFeedback>
					</View>
					
					<PressableIcon onPressOut={()=>action("")} name="multitrack-audio" size={40} style={{height:100}}/>
				</View>
			</Modal>
		</Recorder>
	)
}

const InputText=({submit, textStyle})=>{
	const [value, setValue]=useState("Hello")
	return (
			<TextInput 
				value={value}
				onChangeText={text=>setValue(text)}
				onSubmitEditing={e=>{
					submit(value)
					setValue("")
				}} 
				style={{...textStyle,padding:5,fontSize:16}}/>
	)
}

const Actions=({submit, prompts})=>{
	return (
			<View style={{borderTopWidth:1, padding:5,width:"100%", flex:1, flexDirection:"row", flexWrap:"wrap", justifyContent:"space-around"}}>
				{prompts.map((a,i)=><PressableIcon key={i} {...a} size={50} 
					labelStyle={{color:"black"}}
					onPress={()=>!!a.params ? submit(a) : submit(a.prompt)}
					/>)}
			</View>
	)
}

const MessageTextEx=({submit, cancel, ...props})=>{
	if(typeof props.currentMessage.text !== "object")
		return <MessageText {...props}/>
	const {text:{params, label, settled}}=props.currentMessage
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
										disabled={settled}
										style={inputStyle}
										placeholder={key} 
										defaultValue={value}
										onEndEditing={({nativeEvent:{text}})=>setValues({...values, [key]:text})}/>
							}else{
								return React.cloneElement(value,{disabled:settled,setValue:value=>setValues({...values, [key]:value})})
							}
						})()}
					</View>
				)
			}
		}
		return ui
	},[settled])
	return (
		<View style={{width:250, border:"1px solid", borderRadius:5,padding:5}}>
			<View style={{flex:1, alignItems:"center"}}><Text style={{color:"white"}}>{label.toUpperCase()}</Text></View>
			<View style={{flex:1}}>
				{paramsUI}
				{!settled && <View style={{flex:1, flexDirection:"row"}}>
					<Pressable onPress={()=>submit(values)} style={{flex:1, alignItems:"center"}}>
						<Text  style={{color:"yellow",margin:5}}>SEND</Text>
					</Pressable>
					<Pressable onPress={()=>cancel(values)} style={{flex:1, alignItems:"center"}}>
						<Text  style={{color:"yellow",margin:5}}>CANCEL</Text>
					</Pressable>
				</View>}
			</View>
		</View>
	)
}

export function Speaking(){

}