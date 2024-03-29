import React from "react"
import { View, Animated, Text } from "react-native"
import { useSelector, useDispatch } from "react-redux"

export default function Queue({style}){
    const dispatch=useDispatch()
    const [task, amount]=useSelector(({queue=[]})=>[queue[0], queue.length])
    const [message, setMessage]=React.useState("")
    React.useEffect(()=>{
        if(typeof(task)=="function"){
            Promise.resolve(task(message=>setMessage(message)))
                .finally(()=>{
                    dispatch({type:"my/queue", done:task})
                    setMessage(amount)
                })
        }
    },[task])

    if(!task)
        return null

    return (
        <View style={style}>
            <FluidLoadingBar message={message}/>
        </View>
    )
}

function FluidLoadingBar({ message, duration = 2000, containerStyle,  loadingBarStyle}){
    const animatedValue = React.useRef(new Animated.Value(0)).current;
  
    const startAnimation = () => {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          animatedValue.setValue(0);
          startAnimation();
        }
      });
    };
  
    React.useEffect(() => {
      startAnimation();
    }, []);
  
    return (
      <View style={[{
          height: 20,
          width: '100%',
          backgroundColor: '#E0E0E0', // Background color of the loading bar container
          borderRadius: 5,
          overflow: 'hidden',
        },containerStyle]}>
        <Animated.View
          style={[
              {
                  height: '100%',
                  width: '100%',
                  backgroundColor: '#2196F3', // Loading bar color
                  transform: [
                  {
                      scaleX: animatedValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 1],
                      }),
                  },
                  ],
              },
              loadingBarStyle
          ]}
        >
        </Animated.View>
        {!!message && <Text style={{color:"black",position:"absolute", bottom:2, left:30}}>{message}</Text>}
      </View>
    );
  }