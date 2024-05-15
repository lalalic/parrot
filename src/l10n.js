import makeLocalizedMobile from "react-native-use-qili/tools/make-localized"
import { Platform } from 'react-native';

const obMap=(keys,values)=>keys.reduce((ob,k,i)=>(ob[k]=values[i],ob),{})


function makeLocalized(strings){
    if(Platform.OS=="web"){
        return new Proxy(strings,{
            get(target, key){
                return key
            }
        })
    }
    return makeLocalizedMobile(...arguments)
}

export default globalThis.l10n=makeLocalized({
    zh:{
        "Widgets":"功能件",
        "Help practice particular language skills":"帮助学习特定的语言技能",
        "Chat":"聊天",
        "Dialog Book":"练习对话",
        "Picture Book":"看图识物",
        "Audio Book":"语音集锦",
        "Vocabulary Book":"记单词",
        "Policy":"策略配置",
        "Favorites":"我的集锦",
        "Language":"语言设置",
        "general":"常用",
        "options to control player and reaction":"播放器常用配置",
        "options when shadowing chunk by chunk":"常用跟读单句配置",
        "options when shadowing chunks by chunks":"常用跟读多句配置",
        "options when shadowing paragraph by paragraph":"常用跟读段落配置",
        "shadowing":"单句跟读",
        "dictating":"多句跟读",
        "retelling":"段落跟读",
        "record":"录音",
        "whitespace":"间隔时间",
        "chunk":"音块",
        "visible":"视频",
        "caption":"字幕",
        "caption Delay":"字幕延迟",
        "auto Challenge":"自动挑战分",
        "speed":"速度",
        "fullscreen":"全屏",
        "auto Hide":"自动隐藏",
        "false":"否",
        "true":"是",
        "Mother Language":"母语",
        "Learning Language":"外语",
        "It's empty!":"还没有呢！",
        "No favorite yet!":"你的集锦会显示在这里！",
        "Foreign Language and TTS":"语言和语音设置",
        
        "Create new Vocabulary Book":"新增词汇集锦",
        "Create new Audio Book":"新增语音集锦",
        "Create new Dialog Book":"新增对话集锦",
        "Create new Picture Book":"新增看图识物",
        "Filter":"快速查找",
        "Day Copy":"日拷贝",
        "Week Copy":"周拷贝",
        "Template Day":"日模版",
        "Template Week":"周模版",
        //chat
        "Ask me anything":"可以提问啦",
        "Sorry, can't process your request right now":"对不起，现在处理不了你的请求",
        
        //calendar
        "AM":"上午",
        "PM":"下午",
        today:"今天",
        ...obMap(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            ['周日','周一','周二','周三','周四','周五','周六']),
        ...obMap(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            ['日','一','二','三','四','五','六']),
        ...obMap(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
            ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月']),
        ...obMap(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']),
        
        'kb':" K"
    }
})