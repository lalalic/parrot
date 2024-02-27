import React from "react";
import { ReactReduxContext } from "react-redux";

/**
 * Base for any talk, and widget
 * 1. to provide talk, chunks, 
 * 2. props: {chunks, i, policy, policyName, challenging, onPlaybackStatusUpdate}
 * 3. Widget doesn't manage i, but positionMillion
 * 4. Widget use {chunks, i} to show/speak, so all parts are synced with {chunks, i}
 * 5. Widget must implement setStatusAsync({})
 *      a. don't onPlaybackStatusUpdate during setStatusAsync 
 *          since onPlaybackStatusUpdate may trigger setStatusAsync
 *          then first setStatusAsync might be override
 *      b. queue of syncing status may be better ??
 * 6. Widget must call onPlaybackStatusUpdate to update client 
 */
export default class Base extends React.Component {
    static contextType = ReactReduxContext;
    
    constructor(){
        super(...arguments)
        this.isSettingStatus=false
    }

    get talk() {
        return this.context.store.getState().talks[this.props.id];
    }

    get chunks(){
        return this.props.chunks||[]
    }

    createChunks({update=true}={}){
        const {policyName, challenging}=this.props
        console.log(`creating chunks: [${policyName}, ${challenging}]`)
        const chunks=(()=>{
            if(challenging){
                return this.talk[policyName].challenges
            }else{
                return this.doCreateTranscript?.(...arguments)
            }
        })();

        update && this.onPlaybackStatusUpdate({chunks})
        return chunks
    }

    setStatusAsync(){
        throw new Error("setStatusAsync must be implemented")
    }

    reset(){
        throw new Error("reset must be implemented")
    }

    componentDidMount() {
        const { positionMillis = 0, shouldPlay } = this.props
        this.createChunks()
        this.setStatusAsync({ shouldPlay, positionMillis })
    }
}
