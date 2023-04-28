jest.mock("@react-native-voice/voice",()=>({}))
jest.mock("react-native-tts",()=>({
    setIgnoreSilentSwitch:jest.fn(),
    stop: jest.fn(),
}))
jest.mock("@react-native-community/slider",()=>jest.fn())

jest.mock("../components", () => ({
    ...jest.requireActual("../components"),
    AutoHide: props=><span {...props}/>,
}))

jest.mock('react-router-native', () => ({
    ...jest.requireActual('react-router-native'),
   useNavigate: () => jest.fn(),
 }));

 jest.mock("react-redux",()=>({
    ...jest.requireActual('react-redux'),
    useDispatch:() =>global.dispatch,
 }))

 jest.mock("../components",()=>({
    ...jest.requireActual('../components'),
    Recorder:jest.fn(),
    PlaySound: jest.fn(),
 }))

 jest.mock('@expo/vector-icons',()=>({
    MaterialIcons:"a"
 }))

 jest.mock("../experiment/calendar",()=>({
    deleteEvents:jest.fn(),
    createEvents:jest.fn(),
}))


console.log=jest.fn()
console.warn=jest.fn()
global.dispatch=jest.fn()
global.alert=jest.fn()
 
 
import {Provider} from "../store"
import renderer from "react-test-renderer"

global.render=el=>{
    const render=renderer.create(
        <Provider persistor={false}>
            {el}
        </Provider>
    )
    
    render.update=(_update=>el=>{
        _update.call(render, (
            <Provider persistor={false}>
                {el}
            </Provider>
        ))
    })(render.update);
    return render
}
