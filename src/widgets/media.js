import React from 'react';
import { View, Animated, Easing, Image, Text, FlatList , TextInput, Pressable, ImageBackground} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from 'react-router-native';
import { MaterialIcons } from '@expo/vector-icons';

import { ColorScheme } from '../default-style';

export class Media extends React.Component {
    static Actions=false
    static Management=false

    static defaultProps = {
        isWidget: true,
        progressUpdateIntervalMillis: 100,
        positionMillis: 0,
    }

    constructor({ rate = 1, volume, positionMillis = 0 }) {
        super(...arguments)
        let shouldPlay=false
        const self=this
        this.status = {
            isLoaded: true,
            didJustFinish: false,
            durationMillis: 0,
            positionMillis,
            rate,
            volume,
            isLoading: false,
            set shouldPlay(v){
                shouldPlay=v
            },
            get shouldPlay(){
                return shouldPlay
            },

            get isPlaying(){
                return shouldPlay
            }
        }
        this.params={}
        
        this.progress = new Animated.Value(0);
        this.progress.current = 0
        this.progress.last = 0

        this.state = {
            isPlaying:shouldPlay,
            _status:this.status,
            _params:this.params,
            _progress:this.progress
        }
    }

    get offsetTolerance(){
        return this.props.progressUpdateIntervalMillis*1.5
    }

    get slug(){
        return this.constructor.defaultProps.slug
    }

    shouldComponentUpdate(nextProps, state) {
        if (this.state !== state) {
            return true;
        }
        return false;
    }

    onPlaybackStatusUpdate(particular) {
        this.props.onPlaybackStatusUpdate?.({
            ...this.status,
            ...particular,
            positionMillis: this.progress.current,
            ...this.onPlaybackStatusUpdateMore?.()
        });
    }

    onPositionMillis(positionMillis){

    }

    componentDidMount() {
        const { progressUpdateIntervalMillis, positionMillis = 0, shouldPlay } = this.props;
        this.progress.addListener(({ value }) => {
            if (value == 0)
                return;
            value = Math.floor(value)
            this.onPositionMillis(this.progress.current = value)
            if (this.progress.current - this.progress.last >= progressUpdateIntervalMillis) {
                this.progress.last = value;
                this.onPlaybackStatusUpdate();
            }
        })

        this.setStatusAsync({ shouldPlay, positionMillis });
        this.onPlaybackStatusUpdate();
    }

    componentWillUnmount() {
        this.progress.removeAllListeners()
        this.progressing?.stop()
    }

    setStatusSync({ shouldPlay, positionMillis }) {
        console.log(JSON.stringify(arguments[0]))
        if (positionMillis != undefined) {
            const lastShouldPlay=this.status.shouldPlay
            this.setStatusSync({shouldPlay:false})//stop to reset

            this.progress.last = Math.max(0, positionMillis - (this.progress.current - this.progress.last));
            this.progress.current = positionMillis
            
            this.setStatusSync({shouldPlay:lastShouldPlay})//recover
        }

        if (shouldPlay != undefined) {
            if (shouldPlay != this.status.shouldPlay) {
                if (shouldPlay) {
                    this.status.shouldPlay = true
                    this.status.didJustFinish=false
                    this.progress.setValue(this.progress.current);
                    this.progressing = Animated.timing(this.progress, {
                        toValue: this.status.durationMillis,
                        duration: this.status.durationMillis - this.progress.current,
                        easing: Easing.linear,
                        useNativeDriver: true,
                        isInteraction:false,
                    })
                    this.progressing.start(({finished})=>{
                        this.setState({isPlaying:false})
                        if(!finished)
                            return
                        this.status.didJustFinish=true
                        this.status.shouldPlay = false
                        this.onPlaybackStatusUpdate()
                        this.progress.setValue(0)
                        this.progress.current = 0
                        this.progress.last = 0
                    })
                    this.setState({isPlaying:true})
                    this.onPlaybackStatusUpdate()
                } else {
                    this.progressing?.stop()
                    this.status.shouldPlay = false
                    this.onPlaybackStatusUpdate()
                }
            }
        }
    }

    setStatusAsync() {
        return new Promise((resolve) =>{
            try{
                this.setStatusSync(...arguments)
            }catch(e){
                console.error(e)
            }finally{
                resolve()
            }
            
        })
    }

    title(){
        return this.props.title
    }

    render() {
        const { thumb, posterSource = thumb, source, title, ...props } = this.props
        return (
            <View {...props} style={{width:"100%",height:"100%",paddingTop:50, paddingBottom:50}}>
                {!!posterSource && (<Image source={posterSource}
                    style={{position:"absolute", width: "100%", height: "100%", marginTop:50, marginBottom:50 }} />)}
                <Text style={{paddingTop:50, fontSize:20,height:50}}>{this.title()}</Text>
                {this.doRenderAt()}
            </View>
        )
    }

    doRenderAt(){
        const {i=-1}=this.state
        const cue=this.cues[Math.floor(i)]
        if(!cue)
            return 
        return this.renderAt(cue, Math.floor(i))
    }

    static List=({data, onEndEditing, navigate=useNavigate(), children,
            renderItemText=a=>a.id, 
            renderItem:renderItem0=({item, slug=item.slug, id=item.id})=>(
                <Pressable key={id} 
                    onPress={e=>navigate(`/talk/${slug}/shadowing/${id}`)} 
                    onLongPress={e=>dispatch({type:"talk/clear", id})}
                    style={{height:50, justifyContent:"center", paddingLeft:20, border:1, borderBottomColor:color.inactive}}>
                    <Text style={{fontSize:16}}>{renderItemText(item)}</Text>
                </Pressable>
            ),
            placeholder, 
            inputProps:{style:inputStyle,...inputProps}={}, 
            listProps:{style:listStyle, renderItem=renderItem0, ...listProps}={}, 
            style, ...props})=>{
        const color=React.useContext(ColorScheme)
        return (
            <View style={[{marginTop:10, minHeight:200},style]} {...props}>
                <TextInput onEndEditing={onEndEditing} placeholder={placeholder}
                    style={[{height:50, backgroundColor:color.inactive, paddingLeft:10, fontSize:16},inputStyle]}
                    {...inputProps}
                    />
                <FlatList data={data} renderItem={renderItem} style={[listStyle]} keyExtractor={a=>a.id} {...listProps}/>
                {children}
            </View>
        )
    }

    static Tags=({talk, placeholder})=>{
        const slug=talk.slug
        const color=React.useContext(ColorScheme)
        const dispatch=useDispatch()
        const tags=useSelector(state=>Object.values(state.talks).filter(a=>a.slug==slug && a.id!=slug))
        React.useEffect(()=>{
            if(tags.length==0){
                talk.tags.forEach(tag=>{
                    const id=`${talk.id}_${tag}`
                    dispatch({type:"talk/toggle", talk:{...talk,id}, key:"tag", value:tag})
                })
            }
        },[tags])

        return (
            <Media.List data={tags} 
                placeholder={placeholder}
                onEndEditing={({nativeEvent:{text:tag}})=>{
                    tag=tag.trim()
                    if(!tag)
                        return 
                   if(-1!==tags.findIndex(a=>a.tag==tag))
                        return 
                    const id=`${talk.id}_${tag}`
                    dispatch({type:"talk/toggle", talk:{...talk,id}, key:"tag", value:tag})
                }}
                renderItemText={item=>item.tag}
            >
                <Media.TagShortcut slug={slug}/>
            </Media.List>
        )
    }

    static TagShortcut=({slug})=>{
        const color=React.useContext(ColorScheme)
        return (
            <Link to={`/talk/tagman/${slug}`} style={{position:"absolute",right:10, top:0, height:50}} >
                <MaterialIcons name="category" size={32} color={color.text}/>
            </Link>
        )
    }
}

export class ListMedia extends Media{
    constructor(){
        super(...arguments)
        this.state.i=-1
        this.cues=this.state.cues=[]
    }

    /**
     * create this.cues=[{time,end,text}]
     */
     createTranscript(){
        
    }

    doCreateTranscript(){
        this.createTranscript()
        if(this.cues.length>0){
            this.status.durationMillis=this.cues[this.cues.length-1].time+100
        }
        this.onPlaybackStatusUpdate({
            transcript:[{cues:this.cues}], 
            durationMillis:this.status.durationMillis
        })
    }

    onPlaybackStatusUpdateMore(){
        return {i:this.state.i}
    }

    onPositionMillis(positionMillis){
        const i =this.cues?.findIndex(a=>a.end>=(positionMillis-this.offsetTolerance))
        if(this.state.i!=i){
            this.setState({i})
        }
    }

    componentDidMount(){
        (async()=>{
            try{
                await this.doCreateTranscript()
                super.componentDidMount(...arguments)
            }catch(e){
                console.error(e)
            }
        })()
    }

    setStatusSync({positionMillis}){
        if(typeof(positionMillis)==`undefined`){
            return super.setStatusSync(...arguments)
        }
        const i=this.cues.findIndex(a=>a.end>=positionMillis)
        if(i!=-1){
            return super.setStatusSync({...arguments[0],positionMillis:this.cues[i].time})
        }
    }
}

