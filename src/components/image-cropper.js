import React from 'react';
import { View, Image, TextInput, Text } from 'react-native'
import { PressableIcon } from '.'
import { Gesture, GestureDetector} from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, } from "react-native-reanimated";

export default function ImageCropper({source, viewerSize=150, viewerStyle, onCrop, children}){
	const translateX = useSharedValue(0);
	const translateY = useSharedValue(0);
	const scale = useSharedValue(1);
	const ref=React.useRef()
	const last=React.useRef({x:translateX.value,y:translateY.value, scale:scale.value})
  

	const [containerSize, setContainerSize]=React.useState({x:0,y:0,width:0,height:0})
	const [imageSize, setImageSize]=React.useState({width:0,height:0})
	React.useEffect(()=>{
	if(source.uri){
		Image.getSize(source.uri,(width,height)=>{
			setImageSize({width,height})
		})
	}
	},[source.uri])

	React.useEffect(()=>{
		if(containerSize.width && imageSize.width){
			last.current.scale=scale.value=containerSize.width/imageSize.width
			last.current.x=translateX.value=0-imageSize.width*(1 - scale.value)/2
			last.current.y=translateY.value=0-imageSize.height*(1 - scale.value)/2+locatorXY.top+1
			ref.current?.(last.current)
		}
	},[containerSize, imageSize])

  	
	const pan = Gesture.Pan()
		.onUpdate(event=>{
			translateX.value = last.current.x+event.translationX
			translateY.value = last.current.y+event.translationY
			ref.current?.({x:translateX.value, y:translateY.value})
		})
		.onEnd(event=>{
			last.current.x=translateX.value
			last.current.y=translateY.value
			last.current.rect=getRect()
			ref.current?.(last.current)
		})
		

	const pinch = Gesture.Pinch()
		.onUpdate(event=> {
			scale.value = last.current.scale*event.scale
			ref.current?.({scale:event.scale})
		})
		.onEnd(e=>{
			last.current.scale=scale.value
			ref.current?.(last.current)
		})
		

	const imageContainerStyle = useAnimatedStyle(() => {
		return {
			...imageSize,
			transform: [
				{ translateX: translateX.value },
				{ translateY: translateY.value },
				{ scale: scale.value },
			],
		};
	})

	
	const locatorXY=React.useMemo(()=>({
		left:(containerSize.width-viewerSize)/2,
		top:(containerSize.height-viewerSize)/2,
	}),[viewerSize, containerSize])

	const getRect=React.useCallback(()=>{
		const {left, top}=locatorXY
		const {x:translateX,y:translateY,scale}=last.current
		const size=Math.floor(viewerSize/scale)
		return {
			x: Math.floor((left - translateX)/scale + imageSize.width / 2 - imageSize.width/2/scale),
			y: Math.floor((top- translateY)/scale + imageSize.height / 2 - imageSize.height/2/scale) ,
			width: size, 
			height: size,
		}
	},[locatorXY, imageSize])
	  

	return (
		<View  style={{flex:1}} onLayout={({nativeEvent:{layout}})=>setContainerSize({...layout})}>
			<GestureDetector gesture={Gesture.Race(pan,pinch)}>
				<Animated.View style={imageContainerStyle}>
					<Animated.Image	source={source}	style={imageSize}/>
					{children}
				</Animated.View>
			</GestureDetector>
			<ViewPort style={{
					...viewerStyle,
					width:viewerSize, 
					height:viewerSize,
					...locatorXY
				}}
				onLocate={text=>onCrop?.({text, rect:getRect()})}
				/>
		</View>
	)
}

function Info({refUpdate, getRect}){
	const [info, setInfo]=React.useState({})
	refUpdate.current=a=>setInfo({...info,...a})
	return (
		<View style={{position:"absolute", top:0, left:10}}>
			<Text>
				x={Math.floor(info.x)},
				y={Math.floor(info.y)},
				scale={parseInt(info.scale*10)/10}
			</Text>

			<Text>
				{`rect: ${JSON.stringify(info.rect)}`}
			</Text>
		</View>
	)
}


function ViewPort({style, onLocate}){
    const refEditor=React.useRef()
    return (
            <View style={{ 
                    justifyContent:"center", alignContent:"center",
                    borderWidth:2, borderColor:"red",
                    position:"absolute", 
                    ...style
				}} pointerEvents="box-none">
                <View style={{flexDirection:"row"}}>
                    <TextInput ref={refEditor} textAlign="center"
                        style={{flex:1,height:20, marginLeft:20, marginRight:2, borderBottomWidth:2, borderColor:"yellow", color:"yellow"}}
                        onEndEditing={({nativeEvent:{text}})=>{
                            if(!text)
                                return 
                            onLocate?.(text)
                            refEditor.current.clear()
                        }}
                    />
                    <PressableIcon 
                        color="yellow" name="check" style={{width:20}}
                        onPress={e=>refEditor.current.blur()}/>
                </View> 
            </View>
    )
}

