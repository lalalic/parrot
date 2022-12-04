
import React from "react"
import { requireNativeComponent } from "react-native"

export const ARFaceMotionView =requireNativeComponent("ARFaceMotionView")
export const ARFaceView =requireNativeComponent("ARFaceView")

export const ARBodyMotionView =requireNativeComponent("ARBodyMotionView")
export const ARBodyView =requireNativeComponent("ARBodyView")

const factory=(MotionView, AView)=> ({createItem=el=>el, ...props}) =>{
    const [faces, setFaces]=React.useState([])
    return (
      <MotionView 
        onRemove={({nativeEvent:{anchor}})=>{
          const i=faces.findIndex((a)=>a.uuid==anchor.uuid)
          if(i!=-1){
            faces.splice(i,1)
            setFaces([...faces])
          }
        }}
        onAnchor={({nativeEvent:{anchor}})=>{
            setFaces([...faces,anchor])
        }}
        onUpdate={({nativeEvent:{anchor}})=>{
          const i=faces.findIndex(a=>a.uuid==anchor.uuid)
          if(i!=-1){
            const [face]=faces.splice(i,1)
            faces.splice(i,0,{...face,...anchor})
            setFaces([...faces])
          }
        }}
        {...props}
        >
            {faces.map(({uuid, ...face})=>{
              return createItem(<AView key={uuid} uuid={uuid} {...face}/>)
            })}
        </MotionView>
    )  
}

export const ARFaceMotion=factory(ARFaceMotionView, ARFaceView)
export const ARBodyMotion=factory(ARBodyMotionView, ARBodyView)


export const ARMotion=({type="face",...props})=>{
  if(type=="body")
    return <ARBodyMotion {...props}/>

  return <ARFaceMotion {...props}/>
}