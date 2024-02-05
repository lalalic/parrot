import React from "react";
import { View, Image, TextInput, Text, Animated } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import PressableIcon from "react-native-use-qili/components/PressableIcon";

export default function ImageCropper({ debug=false,
	source,
	viewerSize = 150,
	viewerStyle,
	onCrop,
	children,
}) {
	const translateX = React.useRef(new Animated.Value(0)).current;
	const translateY = React.useRef(new Animated.Value(0)).current;
	const scale = React.useRef(new Animated.Value(1)).current;
	const refInfoUpdate = React.useRef();
	const last = React.useRef({
		x: translateX._value,
		y: translateY._value,
		scale: scale._value,
	});

	const [containerSize, setContainerSize] = React.useState({
		x: 0,
		y: 0,
		width: 0,
		height: 0,
	});
	const [imageSize, setImageSize] = React.useState({ width: 0, height: 0 });

	React.useEffect(() => {
		if (source.uri) {
			Image.getSize(source.uri, (width, height) => {
				setImageSize({ width, height });
			});
		}
	}, [source.uri]);

	React.useEffect(() => {
		if (containerSize.width && imageSize.width) {
			scale.setValue(last.current.scale =containerSize.width / imageSize.width)
			translateX.setValue(last.current.x = 0 - (imageSize.width * (1 - scale._value)) / 2)
			translateY.setValue(last.current.y =0 -(imageSize.height * (1 - scale._value)) / 2 +locatorXY.top*scale._value)
			refInfoUpdate.current?.(last.current);
		}
	}, [containerSize, imageSize]);

	const pan = Gesture.Pan()
		.onUpdate((event) => {
			translateX.setValue(last.current.x + event.translationX);
			translateY.setValue(last.current.y + event.translationY);
			refInfoUpdate.current?.({ x: translateX._value, y: translateY._value });
		})
		.onEnd((event) => {
			last.current.x = translateX._value;
			last.current.y = translateY._value;
			last.current.rect = getRect();
			refInfoUpdate.current?.(last.current);
		});

	const pinch = Gesture.Pinch()
		.onUpdate((event) => {
			scale.setValue(last.current.scale * event.scale);
			refInfoUpdate.current?.({ scale: event.scale });
		})
		.onEnd((e) => {
			last.current.scale = scale._value;
			refInfoUpdate.current?.(last.current);
		});

	const imageContainerStyle = {
		...imageSize,
		transform: [
			{ translateX: translateX },
			{ translateY: translateY },
			{ scale: scale },
		],
	};

	const locatorXY = React.useMemo(
		() => ({
			left: (containerSize.width - viewerSize) / 2,
			top: 50,//(containerSize.height - viewerSize) / 2,
		}),
		[viewerSize, containerSize]
	);

	const getRect = React.useCallback(() => {
		const { left, top } = locatorXY;
		const { x: translateX, y: translateY, scale } = last.current;
		const size = Math.floor(viewerSize / scale);
		return {
			x: Math.floor(
				(left - translateX) / scale +
					imageSize.width / 2 -
					imageSize.width / 2 / scale
			),
			y: Math.floor(
				(top - translateY) / scale +
					imageSize.height / 2 -
					imageSize.height / 2 / scale
			),
			width: size,
			height: size,
		};
	}, [locatorXY, imageSize]);

	return (
		<GestureDetector gesture={Gesture.Race(pan, pinch)}>
			<View
				style={{ flex: 1, overflow: "hidden"}}
				onLayout={({ nativeEvent: { layout } }) =>{
					if(containerSize.width==0){
						setContainerSize({ ...layout})
					}
				}}
				>
				{debug && <Info refUpdate={refInfoUpdate}/>}
				<Animated.View style={imageContainerStyle}>
					<Animated.Image source={source} style={imageSize} />
					{children}
				</Animated.View>
				<ViewPort
					style={{
						...viewerStyle,
						width: viewerSize,
						height: viewerSize,
						...locatorXY,
					}}
					onLocate={(text) => onCrop?.({ text, rect: getRect() })}
				/>
			</View>
		</GestureDetector>
	);
}

function Info({ refUpdate }) {
	const [info, setInfo] = React.useState({});
	refUpdate.current = (a) => setInfo({ ...info, ...a });
	return (
		<View style={{ position: "absolute", top: 0, left: 10 }}>
			<Text>
				x={Math.floor(info.x)}, y={Math.floor(info.y)}, scale=
				{parseInt(info.scale * 10) / 10}
			</Text>

			<Text>{`rect: ${JSON.stringify(info.rect)}`}</Text>
		</View>
	);
}

function ViewPort({ style, onLocate }) {
	const refEditor = React.useRef();
	return (
		<View
			style={{
				justifyContent: "center",
				alignContent: "center",
				borderWidth: 2,
				borderColor: "red",
				position: "absolute",
				...style,
			}}
			pointerEvents="box-none"
		>
			<View style={{
				position:"absolute",
				width:"100%",height:"100%",
				justifyContent: "center",flexDirection:"row",
				alignContent: "center",}}>
				<PressableIcon color="yellow" name="add" style={{opacity:0.5}}/>
			</View>
			<View style={{ flexDirection: "row" }}>
				<TextInput
					ref={refEditor}
					textAlign="center"
					style={{
						flex: 1,
						height: 20,
						fontSize:20,
						backgroundColor:"white",
						color:"black",
						opacity:0.3,
					}}
					onEndEditing={({ nativeEvent: { text } }) => {
						if (!text) return;
						onLocate?.(text);
						refEditor.current.clear();
					}}
					enterKeyHint="done"
				/>
			</View>
		</View>
	);
}
