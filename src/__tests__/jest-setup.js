jest.mock("@react-native-voice/voice",()=>({}))
jest.mock("react-native-tts",()=>({}))
jest.mock("@react-native-community/slider",()=>jest.fn())

jest.mock("../components", () => ({
    ...jest.requireActual("../components"),
    AutoHide: props=><span {...props}/>,
}))

jest.mock('react-router-native', () => ({
    ...jest.requireActual('react-router-native'),
   useNavigate: () => jest.fn(),
 }));

 jest.mock('@expo/vector-icons',()=>({
    MaterialIcons:"a"
 }))

console.log=jest.fn()

import {Provider} from "../store"
import renderer from "react-test-renderer"

global.render=el=>renderer.create(
    <Provider persistor={false}>
        {el}
    </Provider>
)
