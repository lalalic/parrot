import React from 'react';
import {View, StyleSheet} from "react-native"
import {shallowEqual, useSelector} from "react-redux"
import { Audio } from 'expo-av'
import { produce } from "immer"
import { useKeepAwake} from "expo-keep-awake"


import Recognizer from "../Recognizer";
import AutoHide from "../AutoHide";
import SliderIcon from "../SliderIcon";
import { ProgressBar } from './ProgressBar';
import { NavBar } from './NavBar';
import { Subtitle } from './Subtitle';
import { PersistentHistory } from './PersistentHistory';
import Context from './Context';
import ControlBar from './ControlBar';

const asyncCall=fn=>setTimeout(fn, 0)

/**
 * 2 models: with or without transcript
 * cue: {text(audio, caption, subtitles), test=text(recognze, diff), time, end}
@TODO: 
1. why is it constantly rerendered although status is not changed 

 */
export default function Player({
    debug=true,
    id, //talk id 
    media:mediaElement,
    title,
    children, //customizable controls
    policyName="general", //used to get history of a policy
    policy,

    challenging,
    
    toggleChallengeChunk,getRecordChunkUri,  
    onPolicyChange, onRecordChunk, onQuit,

    controls:_controls,
    layoverStyle, navStyle, subtitleStyle, progressStyle,
    ...props}){
    renderCounter()
    useKeepAwake()

    const media=React.useRef()

    //move out of reducer to bail out rerender
    const onProgress=React.useRef()
    
    //exclusive for subtitle and subtitles
    const [showSubtitle, setShowSubtitle]=React.useState(true)

    //1. media create chunks according to policy
    const [chunks, setChunks]=useChunks({media, id, policy, policyName, challenging})

    const { autoHideActions, autoHideProgress, setAutoHide } = useAutoHide(policy);
    const changePolicy=React.useCallback((key,value)=>{
        onPolicyChange?.({[key]:value})
        setAutoHide(Date.now())
    },[onPolicyChange, setAutoHide])
    const [setMediaStatusAsync] = useMediaStatusControl({debug, media});
    const [status, dispatch] = useLocalState({setMediaStatusAsync, onProgress, toggleChallengeChunk, changePolicy,  chunks, challenging, debug});
    const onPlaybackStatusUpdate=usePlaybackStatusUpdate({setChunks, onProgress, chunks, setMediaStatusAsync, policy, dispatch, status, debug})
    
    const onRecord=React.useCallback(record=>{
        const {i, chunk=chunks[i]}=status
        const isLastChunk = i>=chunks.length-1
        onRecordChunk?.({chunk, record, isLastChunk})
    },[status.i,chunks])

    const firePlayerEvent=React.useCallback(action=>dispatch({type:action}),[dispatch])
    const controls=useControls(_controls, chunks, challenging, policy)
    const currentChunk=React.useMemo(()=>chunks[status.i],[chunks, status.i])
    return (
        <>
        <SliderIcon.Container onStartShouldSetResponder={e=>setAutoHide(Date.now())} {...props}>
            {React.cloneElement(mediaElement, {
                ref:media,
                onPlaybackStatusUpdate,
                rate:policy.rate, 
                style:Styles.media,
                positionMillis: useSelector(state=>state.talks[id]?.[policyName]?.history??0),
                
                //Widget needs
                policy, policyName, whitespacing: status.whitespacing, challenging, i: status.i, chunks,
            })}
            <View pointerEvents='box-none'
                style={[Styles.layover,{backgroundColor:false!=policy.visible?"transparent":"black"},layoverStyle]}>
                
                {false!=controls.nav && 
                <View style={Styles.navBar}>
                    <NavBar {...{
                        testID: "navBar",
                        controls,
                        id, policyName, chunk:currentChunk,//isChallenged
                        dispatch,status,
                        navable:chunks?.length>=2,
                        size:32, style:navStyle }}/>
                </View>
                }
                
                <AutoHide hide={autoHideActions} testID="controlBar" style={Styles.controlBar}>
                    {ControlBar({controls, policy, changePolicy, dispatch})}
                </AutoHide>
                
                <View style={{position:"absolute",bottom:0, width:"100%"}}>
                    {status.whitespacing && 
                    <Recognizer 
                        key={currentChunk.text} 
                        id={currentChunk.text} 
                        locale={currentChunk?.recogMyLocale}
                        onRecord={onRecord}  
                        style={Styles.recognizer}
                        uri={currentChunk && getRecordChunkUri?.(currentChunk)} 
                        />
                    }

                    {showSubtitle && policy.caption && false!=controls.subtitle && 
                    <Subtitle 
                        testID="subtitle"
                        style={[Styles.subtitle, subtitleStyle]}
                        id={id} 
                        item={currentChunk} 
                        policyName={policyName}
                        numberOfLines={4}
                        adjustsFontSizeToFit={true}
                        delay={currentChunk?.test ? 0 : policy.captionDelay/*delay for test*/}
                        />
                    }

                    {controls.progressBar!=false && 
                    <AutoHide hide={autoHideProgress} style={[Styles.progress,progressStyle]}>
                        <ProgressBar {...{
                            onProgress,
                            duration:status.durationMillis,
                            onValueChange:time=>dispatch({type:"media/time", time:Math.floor(time)}),
                            onSlidingStart:e=>setAutoHide(Date.now()+2*60*1000),
                            onSlidingComplete:e=>setAutoHide(Date.now())
                        }}/> 
                    </AutoHide>}
                </View>
            </View>
        </SliderIcon.Container>

        {!policy.fullscreen && 
        <Context.Provider 
            value={{
                id, status, chunks, dispatch, setShowSubtitle, 
                getRecordChunkUri, policy, policyName, challenging,
                firePlayerEvent, media:media, controls,
            }}>
            {children}
        </Context.Provider>
        }
        <PersistentHistory onQuit={onQuit} positionMillis={currentChunk?.time}/>
        </>
    )
}

const Styles=StyleSheet.create({
    media: {flex:1, minHeight:150},
    layover: {position:"absolute",width:"100%",height:"100%",},
    navBar: {flex:1, flexDirection:"column", justifyContent:"center"},
    controlBar: {height:40,flexDirection:"row",padding:4,justifyContent:"flex-end",position:"absolute",top:0,width:"100%"},
    subtitle: {width:"100%",textAlign:"center",fontSize:16},
    progress: {position:"absolute",bottom:0, width:"100%"},
    recognizer: {width:"100%",textAlign:"center",fontSize:16},
})

/**
 * To create chunk
 * @param {*} param0 
 * @returns 
 */
function useChunks({media, id, policy, challenging}) {
    const InitChunks=React.useMemo(()=>[],[])
    const [chunks, setChunks]= React.useState(InitChunks)
    const $chunks=useRefLatest(chunks)
    //a trigger for media to recreate chunks
    React.useEffect(() => {
        if(media.current && $chunks.current!=InitChunks){
            media.current.createChunks()

        }
    }, [id, policy.chunk, challenging])
    return [chunks, setChunks]
}

function renderCounter() {
    const performanceCount = React.useRef(0);
    console.info(`player rendered ${performanceCount.current++} times`);
}

function useAutoHide(policy) {
    const autoHideActions = React.useRef();
    const autoHideProgress = React.useRef();
    const setAutoHide = React.useCallback((time) => {
        autoHideProgress.current?.(time);
        autoHideActions.current?.(policy.autoHide ? time : false);
    }, [policy.autoHide]);
    return { setAutoHide, autoHideActions, autoHideProgress };
}

function useMediaStatusControl({media, debug}) {
    const stopOnMediaStatus = React.useRef(false);
    
    const setMediaStatusAsync = React.useCallback(async (status, callback) => {
        debug && console.debug({ setMediaStatusAsync: true, ...status });
        const done = await media.current?.setStatusAsync(status);
        callback?.();
        return done;
    }, [media]);

    return [setMediaStatusAsync, stopOnMediaStatus];
}

function usePlaybackStatusUpdate({setChunks, onProgress, chunks, setMediaStatusAsync, policy, dispatch, status, debug}) {
    console.log(`usePlaybackStatusUpdate is called with ${chunks.length} chunks`)
    const $chunks = useRefLatest(chunks)
    const $status=useRefLatest(status)
    const $policy=useRefLatest(policy)
    return React.useCallback(mediaStatus => {
        debug && console.debug(`media status: ${JSON.stringify(mediaStatus)}`);

        let chunks=$chunks.current
        const state=$status.current
        const policy=$policy.current

        if(mediaStatus.positionMillis){
            asyncCall(() => onProgress.current?.(mediaStatus.positionMillis));
        }

        if(mediaStatus.chunks){
            setChunks($chunks.current=mediaStatus.chunks)
            return 
        }

        const { i: currentIndex, whitespacing } = state;
        const nextState = (() => {
            if (
                !mediaStatus.isLoaded ||
                mediaStatus.shouldPlay != mediaStatus.isPlaying ||// player is ajusting play status 
                mediaStatus.positionMillis <= state.minPositionMillis ||//player offset ajustment
                whitespacing //
            ) {
                return state;
            }

            const {isLoaded, positionMillis, isPlaying, rate, durationMillis = 0,} = mediaStatus;
            const nextIndex = positionMillis < chunks[0]?.time ? -1 : chunks.findIndex(a => a.end >= positionMillis) 

            const current = { isLoaded, isPlaying, rate, durationMillis, i: nextIndex };

            //copy temp keys from state
            ;["lastRate"].forEach(k => k in state && (current[k] = state[k]));

            const isLast = chunks.length > 0 && nextIndex == -1 && currentIndex == chunks.length - 1;

            if (positionMillis >= chunks[currentIndex]?.end && //current poisiton must be later than last's end
                (currentIndex + 1 == nextIndex //normally next
                    || isLast) //last 
            ) { //current is over
                if (policy.whitespace) {
                    console.info('whitespace/start');
                    const whitespace = policy.whitespace * (chunks[currentIndex].duration || (chunks[currentIndex].end - chunks[currentIndex].time));
                    setMediaStatusAsync({ shouldPlay: false }, globalThis.sounds.ding);
                    const whitespacing = setTimeout(() => dispatch({ type: "whitespace/end", isLast }), whitespace + 2000);
                    return { ...state, whitespace, whitespacing };
                }
            }

            return current;
        })();

        if (state != nextState && !shallowEqual(state, nextState)) {
            dispatch({ type: "media/status/changed", state: nextState });
        }
    }, [dispatch, setChunks])
}

function useRefLatest(value) {
    const ref = React.useRef();
    ref.current = value
    return ref
}

function useControls(_controls, chunks=[], challenging, policy) {
    return React.useMemo(() => {
        return {
            ..._controls,
            ...(chunks.length == 0 && { subtitle: false, record: false, video: false, caption: false, chunk: false, slow: false, prev: false, next: false, select: false, whitespace: false, autoChallenge: false, speed: false }),
            ...(challenging && { chunk: false }),
            //            ...(policy.fullscreen && {slow:false,prev:false,next:false,select:false})
        };
    }, [_controls, chunks, policy.fullscreen, challenging,]);
}

function useLocalState({setMediaStatusAsync, onProgress, toggleChallengeChunk, changePolicy, debug, chunks, challenging}) {
    const $chunks=useRefLatest(chunks)
    const nextRound = useRefLatest(React.useCallback(shouldPlay => {
        setMediaStatusAsync({
            shouldPlay: shouldPlay == undefined ? !!challenging : shouldPlay,
            positionMillis: $chunks.current[0]?.time
        });
    }, [!!challenging]))

    return React.useReducer((state, action) => {
        const { isPlaying, i, whitespacing, rate: currentRate, lastRate } = state;
        const chunks = $chunks.current
        const rate = lastRate || currentRate;

        function terminateWhitespace(next, newState, callback) {
            whitespacing && clearTimeout(whitespacing);
            setMediaStatusAsync(next = { shouldPlay: true, rate, ...next }, callback);
            return produce(state, $state => {
                $state.isPlaying = next.shouldPlay;
                delete $state.whitespace;
                delete $state.whitespacing;
                delete $state.lastRate;
                if (next?.positionMillis)
                    $state.minPositionMillis = next.positionMillis;
                for (const key in newState) {
                    $state[key] = newState[key];
                }
            });
        }

        function CurrentChunkPositionMillis(I = i){
            return chunks[I]?.time ?? chunks[0]?.time
        }

        const nextState = (() => {
            switch (action.type) {
                case "nav/replaySlow":
                    return terminateWhitespace(
                        { positionMillis: CurrentChunkPositionMillis(), rate: Math.max(0.25, rate - 0.25) },
                        { lastRate: rate }
                    );
                case "nav/replay":
                    return terminateWhitespace(
                        { positionMillis: CurrentChunkPositionMillis() },
                        { canReplay: state.canReplay - 1 }
                    );
                case "nav/prevSlow":
                    return (prev => terminateWhitespace(
                        { positionMillis: CurrentChunkPositionMillis(prev), rate: Math.max(0.25, rate - 0.25) },
                        { lastRate: rate, i: prev }
                    ))(Math.max(i - 1, 0));
                case "nav/prev":
                    return (prev => terminateWhitespace(
                        { positionMillis: CurrentChunkPositionMillis(prev) },
                        { i: prev }
                    ))(Math.max(i - 1, 0));
                case "nav/play":
                    return terminateWhitespace({
                        shouldPlay: whitespacing ? false : !isPlaying,
                        positionMillis: CurrentChunkPositionMillis()
                    });
                case "nav/reset": {
                    asyncCall(() => onProgress.current?.(0));
                    return terminateWhitespace(
                        { shouldPlay: false },
                        { i: 0 },
                        () => setTimeout(() => nextRound.current(false), 1000) //wait 1 second for challege store complete
                    );
                }
                case "whitespace/end": {
                    if (action.isLast) {
                        asyncCall(() => onProgress.current?.(0));
                        return terminateWhitespace(
                            { shouldPlay: false },
                            { i: 0 },
                            () => setTimeout(() => nextRound.current(), 1000) //wait 1 second for challege store complete
                        );
                    } else {
                        //same as nav/next
                    }
                }
                case "nav/next":
                    return (next => terminateWhitespace(
                        { positionMillis: CurrentChunkPositionMillis(next) },
                        { i: next }
                    )
                    )((i + 1) % chunks.length);
                case "nav/pause":
                    return terminateWhitespace({
                        shouldPlay: false,
                        positionMillis: CurrentChunkPositionMillis()
                    }, {}, action.callback);
                case "nav/challenge": {
                    const i = action.i ?? state.i;
                    i != -1 && asyncCall(() => toggleChallengeChunk?.(chunks[i]));
                    break;
                }
                case "speed/toggle":
                    setMediaStatusAsync({ rate: rate == 0.75 ? 1 : 0.75 })
                        .then(a => changePolicy("speed", a.rate));
                    break;
                case "speed/tune":
                    setMediaStatusAsync({ rate: action.rate })
                        .then(a => changePolicy("speed", a.rate));
                    break;
                case "record/chunk": //not implemented
                    asyncCall(() => onLongtermChallenge?.(action.chunk));
                    break;
                case "media/time": {
                    const i = chunks.findIndex(a => a.time >= action.time);
                    return terminateWhitespace(
                        { positionMillis: CurrentChunkPositionMillis(i), shouldPlay: action.shouldPlay ?? isPlaying },
                        { i: i == -1 ? chunks.length - 1 : i }
                    );
                }
                case "media/status/changed":
                    return action.state;
            }

            return state;
        })();
        if (debug && !shallowEqual(nextState, state)) {
            console.debug(`status: ${action.type}: next[${chunks[nextState.i]?.time || ""}-${chunks[nextState.i]?.end || ""}]\n${JSON.stringify(nextState)}`);
        }
        return nextState;
    }, { isLoaded: false, i: -1, durationMillis: 0 })
}


