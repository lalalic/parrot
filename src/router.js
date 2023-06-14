import React from "react"
import { View } from "react-native"
import { NativeRouter, Route, Routes, Link, Outlet, useLocation, useParams, useNavigate} from "react-router-native"
import { MaterialIcons } from '@expo/vector-icons';

import Home from "./home"
import Talks from "./talks"
import Talk from "./talk"
import Scheduler from "./plan"

import Account from "./account"
import Explorer from "./account/file-explorer"
import Policy from "./account/policy"
import Favorites from "./account/favorites"
import Lang from "./account/lang"
import Test from "./account/test"
import Admin from "./admin"
import Log from "./account/log"
import About from "./account/about"

import { ColorScheme } from "./components/default-style"
import TaggedTranscript from "./widgets/tagged-transcript"
import { DailyPicture } from "./widgets/picture-book";
import * as Linking from "expo-linking";

export default ({scheme=React.useContext(ColorScheme)})=>(
    <NativeRouter initialEntries={["/home","/widget/picturebook/DailyPicture",]}>
        <Routes>
            <Route path="/" element={React.createElement(()=>{
                    const {pathname}=useLocation()
                    return (
                        <View style={{flex:1}}>
                            <View style={{flexGrow: 1,flex:1}}>
                                <Outlet/>
                                {/*<ShareMointor/>*/}
                            </View>
                            <View style={{flexDirection: "row", justifyContent: "space-around",}}>
                                {[["/home","home"],["/plan","date-range"],["/account","account-circle"]].map(([to,name])=>{
                                    return (
                                        <Link key={name} to={to} style={{flex: 1,alignItems: "center", padding: 10}}>
                                            <MaterialIcons name={name} color={pathname.startsWith(to) ? scheme.active : undefined}/>
                                        </Link>
                                    )
                                })}
                            </View>
                        </View>
                    )
                })}>
                    
                <Route path="talks" element={<Talks/>} />
                <Route path="home" element={<Home/>} />
                <Route path="account">
                    <Route path="" element={<Account/>}/>
                    <Route element={<WithBackButton/>}>
                        <Route path="policy" element={<Policy/>}/>
                        <Route path="favorites" element={<Favorites/>}/>
                        <Route path="language" element={<Lang/>}/>
                        <Route path="files" element={<Explorer exclude={["appData"]} title="File Explorer"/>}/>
                        <Route path="test" element={<Test/>}/>
                        <Route path="logs" element={<Log/>}/>
                        <Route path="about" element={<About/>}/>
                    </Route>
                </Route>
                <Route path="plan" element={<Scheduler/>}/>
            </Route>

            <Route path="/talk" element={<WithBackButton/>}>
                <Route path=":slug" element={<Talk/>}/>
                <Route path=":slug/:policy" element={<Talk/>}/>
                <Route path=":slug/:policy/:id" element={<Talk/>}/>
            </Route>

            <Route path="/widget" element={<WithBackButton/>}>
                <Route path=":slug" element={React.createElement(()=>{
                        const {slug,}=useParams()
                        const Widget=globalThis.Widgets[slug]
                        if(!Widget)
                            return null
                        
                        if(Widget.TagManagement){
                            const TagManagement=Widget.$TagManagement || (Widget.$TagManagement=Widget.TagManagement.bind(Widget))
                            return <TagManagement/>
                        }

                        return <Widget/>
                    })} 
                />

                <Route path=":slug/:id" element={<TaggedTranscript/>}/>
                <Route path="manage/:slug" element={<TaggedTranscript/>}/>
                <Route path="picturebook/DailyPicture" element={<DailyPicture/>}/>
            </Route>
            <Route path="/admin" element={<WithBackButton/>}>
                <Route path="" element={<Admin/>}/>
            </Route>
            <Route element={React.createElement(()=><WithBackButton><Text>oops!</Text></WithBackButton>)}/>
        </Routes>
    </NativeRouter>
)

const WithBackButton=()=>(
    <View style={{flex:1}}>
        <Outlet/>
        <Link to={-1} style={{position:"absolute",left:10}}>
            <MaterialIcons name="keyboard-arrow-left"  size={32} color="white"/>
        </Link>
    </View>
)
 
function ShareMointor(){
    //Linking.useURL()//
    const url="parrot://share/?url=https://www.youtube.com/watch?v=gOqitVsRYRE"
    const navigate=useNavigate()
    const getVideoId=React.useCallback(url=>{
        url=url.split("?url=")[1]
        const parsed=Linking.parse(decodeURIComponent(url))
        if(!["youtu.be","www.youtube.com","youtube.com"].includes(parsed.hostname))
            return 
        return parsed.queryParams.v || parsed.path
    },[])
    React.useEffect(()=>{
        if(!url)
            return
        const videoId=getVideoId(url)
        if(!videoId)
            return 
        navigate(`/talk/youtube/general/${videoId}`)
    },[])
    return null
}