import React from "react";
import { View, Pressable, Switch, Text, ActivityIndicator } from "react-native";
import { Bubble, GiftedChat } from "react-native-gifted-chat";
import { useDispatch, useSelector } from "react-redux";
import Avarta from "./avarta";
import { bot } from "./use-wechat";


function Amount(){
	return useSelector(state=>state.wechat.amount)||""
}

function TodayAmount(){
	const sum=useSelector(({wechat:{messages, amount}})=>{
		const now=new Date().toDateString()
		let spanTodayed=false
		const today=messages.reduce((today,a)=>{
			if(spanTodayed)
				return today
			if(a.user._id==bot._id){
				if(new Date(a.createdAt).toDateString()==now){
					today++
				}else{
					spanTodayed=true
				}
			}
			return today
		},0)
		return amount==today ? 0 : today
	})
	return sum||""
}

export default function AutobotMessages({}) {
	const { messages, chatbot } = useSelector(
		({ wechat: { messages, chatbot } }) => ({ messages, chatbot })
	);
	const dispatch = useDispatch();
	return (
		<View style={{ flex: 1, opacity: chatbot ? 1 : 0.5 }}>
			<View
				style={{
					width: "100%",
					height: 50,
					flexDirection: "row",
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				<Text style={{position:"absolute", left:50}}><TodayAmount/></Text>
				<Switch
					value={chatbot}
					style={{ transform: [{ scale: 0.6 }] }}
					onValueChange={(e) =>
						dispatch({
							type: "wechat/set",
							payload: { chatbot: !chatbot },
						})
					}
				/>

				<Text style={{position:"absolute", right:50}}><Amount/></Text>
			</View>
			<GiftedChat
				style={{ flexGrow: 1 }}
				user={bot}
				messages={messages}
				alignTop={true}
				renderAvatarOnTop={true}
				isKeyboardInternallyHandled={false}
				showAvatarForEveryMessage={true}
				renderComposer={() => <View />}
				renderUsernameOnMessage={true}
				onLongPress={(ctx, {pending, _id})=>pending && dispatch({type:"wechat/message/remove", _id})}
				renderBubble={({currentMessage, ...props}) => {
					const borderRadius = 5,
						margin = 45;
					const textStyle = {
						maxHeight: 100,
						overflow: "hidden",
						fontSize: 12,
						lineHeight: 15,
						color: "#151c16",
					};
					const timeTextStyle = { color: "gray" };
					const {myRole, senderRole, scenario, user,}=currentMessage
					const params=[myRole, senderRole, scenario].filter(a=>!!a)
					if(user._id!=bot._id && params.length>0){
						currentMessage={...currentMessage, text:`[${params.join("/")}]:${currentMessage.text}`}
					}
					return (
						<Bubble
							{...props}
							currentMessage={currentMessage}
							wrapperStyle={{
								left: {
									backgroundColor: "#f7faf7",
									borderRadius,
									marginRight: margin,
								},
								right: {
									backgroundColor: "#29ba41",
									borderRadius,
									marginLeft: margin,
								},
							}}
							textStyle={{ left: textStyle, right: textStyle }}
							usernameStyle={{
								fontSize: 10,
								top: 0,
								color: "gray",
							}}
							timeTextStyle={{
								left: timeTextStyle,
								right: timeTextStyle,
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
						/>
					);
				}}
				
				showUserAvatar={true}
				renderAvatar={({ currentMessage: { user } }) => (
					<Avarta user={user} />
				)}
			/>
		</View>
	);
}
