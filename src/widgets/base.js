import React from "react";
import { ReactReduxContext } from "react-redux";

export default class Base extends React.Component {
    static contextType = ReactReduxContext;
    get talk() {
        return this.context.store.getState().talks[this.props.id];
    }

    get chunks(){
        return this.props.chunks||[]
    }

    createChunks(){
        const {policyName, challenging}=this.props
        if(challenging){
            return this.talk[policyName].challenges
        }else{
            return this.doCreateTranscript?.()
        }
    }
}
