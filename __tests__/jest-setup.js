
import {Provider} from "../src/store"
import renderer from "react-test-renderer"

jest.mock("@react-native-voice/voice",()=>({}))
jest.mock("react-native-tts",()=>({
    setIgnoreSilentSwitch:jest.fn(),
    stop: jest.fn(),
}))
jest.mock("@react-native-community/slider",()=>jest.fn())

jest.mock("../src/components", () => ({
    ...jest.requireActual("../src/components"),
    AutoHide: props=><span {...props}/>,
}))

jest.mock('react-router-native', () => ({
    ...jest.requireActual('react-router-native'),
   useNavigate: () => jest.fn(),
   Link: jest.fn(),
 }));

 jest.mock("react-redux",()=>({
    ...jest.requireActual('react-redux'),
    useDispatch:() =>global.dispatch,
 }))

 jest.mock("../src/components",()=>({
    ...jest.requireActual('../src/components'),
    Recorder:jest.fn(),
    PlaySound: jest.fn(),
 }))

 jest.mock('@expo/vector-icons',()=>({
    MaterialIcons:"a"
 }))

 jest.mock("../src/experiment/calendar",()=>({
    deleteEvents:jest.fn(),
    createEvents:jest.fn(),
}))


console.log=jest.fn()
console.warn=jest.fn()
global.dispatch=jest.fn()
global.alert=jest.fn()

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