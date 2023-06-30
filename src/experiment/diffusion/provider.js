import React from "react"
import Bro from "./bro"
import ProvideWeb from "../../components/provider-web"

const DiffusionContext=React.createContext({})

export function Provider(props){
    return (
        <ProvideWeb id="diffusion"
            Context={DiffusionContext}
            uri="https://runwayml-stable-diffusion-v1-5.hf.space/"
            bro={Bro}
            {...props}
            >
        </ProvideWeb>
        )
}

export function useDiffusion(){
    return React.useContext(DiffusionContext)
}