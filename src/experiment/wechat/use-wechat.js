import React from "react";
import useAsk from "use-qili/components/useAsk";
import services from "../../components/webview-services"
import { useStore } from "react-redux";


export const types={text:1, image:2, audio:3, redpack:2001}
export const bot={_id:"bot", name:"bot"}

export const WeChatContext = React.createContext({});

export function useWeChat() {
    return React.useContext(WeChatContext);
}
export function useAutobot(wechat) {
    const ask = useAsk()
    const diffusion = services.diffusion.useService()
    let uuid=Date.now()
    const store=useStore()
    let keyExp=null, keyImageExp=null
    let last={}
    return React.useCallback(async ({ content, from, to, room, id, type, createdAt}) => {
        id=id||`${uuid++}`
        const {dispatch, getState, state=getState()}=store
        const { me, key, keyImage, loginAt, messages, policy, scenarioes, chatbot, enableScenario, enableRole, enableSchedule, enableSelf, schedule } = state.wechat
        
        keyExp=key && new RegExp(key,"ig")
        keyImageExp=keyImage && new RegExp(key,"ig")

        if (!chatbot) {
            return;
        }

        if(last.content==content && last.from==from.id){//bot send
            return 
        }

        if(createdAt<loginAt){
            return 
        }

        if(isNatrualBanded(from)){
            return 
        }

        if(messages.findIndex(a=>a._id==id)!=-1){
            return 
        }

        if (type!==types.text) {//text
            return
        }

        //@bot
        const keyed=key && keyExp.test(content)
        if(keyed){
            content=content.replace(keyExp, "")
        }

        //@art
        const keyedImage= keyImage && keyImageExp.test(content)
        if(keyedImage){
            content=content.replace(keyImageExp, "")
        }

        if (from.isSelf) {
            if(!to.isSelf){
                return 
            }
                
            if(!enableSelf && !keyed){
                return
            }
        }

        if (enableSchedule) {
            const now = new Date();
            const has = schedule[`${now.getDay()}`] || schedule['*'];
            if (has) {
                let { start, end } = has
                start=Date.toTimeInt(start)
                end=Date.toTimeInt(end)
                const nowInt = now.asTimeInt()
                if(start==end){
                    return 
                }else if(start<end){ //18 - 23
                    if (nowInt <start || nowInt >= end) {
                        return
                    }
                }else{ //18 - 11(next day)
                    if(!((nowInt>start && nowInt<240000) || nowInt<end)){
                        return 
                    }
                }
            }
        }

        const myRole = enableRole && (room ? policy[room.id]?.me : policy[from.id]?.me);
        const senderRole = enableRole && (room ? policy[room.id]?.[from.id] || policy[room.id]?.['*'] : policy[from.id]?.['*']);
        const sendingScenarioes = room ? policy[room.id]?.scenarioes : policy[from.id]?.scenarioes || Object.keys(scenarioes)
        const scenario = enableScenario && pickScenario(sendingScenarioes, content, scenarioes);

        //@bot or scenario
        const prompt = keyedImage ? content : 
            (keyed || scenario) && `
            ${myRole ? `You are ${myRole}.` : ""}
            ${senderRole ? `I'm ${senderRole}.` : ""} 
            ${scenario ? `The scenario is ${scenario}.` : ""}
            ${content}`.trim()

        if(!prompt){
            return 
        }

        dispatch({ type: "wechat/message", message: {
            _id: id, 
            user: { _id: from.id, name: from.name, room }, 
            text: content, 
            pending: true, 
            createdAt: new Date(createdAt*1000),
            keyed,scenario, myRole, senderRole,
        } });
        
        try{
            const answer = (async ()=>{
                if(keyedImage){
                    const images=await diffusion.generate(prompt)
                    images.map(async image=>await wechat.sendImage(image))
                    

                }else{
                    return await ask(prompt, room?.id || from.id);
                }
            })();
            
                
            last={content:answer, from: room?.id || from.id}
        
            await wechat.send(room?.UserName || from.UserName, answer)
            dispatch({ type: "wechat/message", message: { 
                answerTo: id,
                user: {...bot, room }, 
                text: answer, 
                createdAt: new Date(),
            } })
        }catch(e){
            console.error(e.message)
            dispatch({type:"wechat/message/remove", _id:id})
        }
    }, [ask, store]);
}

/**
policy:{
    [room]:{
        "me":"Assistant,...",
        "*":"English Learner,...",
        [uid]:"..."
        "scenarioes":",,,"
    },
    [username]:{
        "me":"Father",
        "*":"Daughter",
        "scenarioes":",,,"
    }
}

{room, sender, ask}=>{my role, sender role, scenarioe, ask}
 */
export const BandGroup="Brands/Blacked/Deleted"

const Groups = {
    ["My Rooms"]: a => a.id && a.name && a.isRoomContact && a.isRoomOwner,
    ["Starred"]: a => a.id && a.name && !!a.starred,
    ["Rooms"]: a => a.id && a.name && a.isRoomContact,
    [BandGroup]:a => isNatrualBanded(a),
    ["Friends"]: a=>true
}

export function isNatrualBanded(a){
    return !a.id || !a.name || a.isBrandContact || a.isBlackContact || a.isRoomContactDel
}

export function sortGroup(a,b){
    const groups=Object.keys(Groups)
    return groups.indexOf(a.group)-groups.indexOf(b.group)
}
export function getContactGroup(contact) {
    const groups = Object.keys(Groups);
    return groups.find(g => Groups[g](contact));
}
export function getRoleAndScenario(policy, contact, room) {
    const group = contact.group || getContactGroup(contact);
    const a = policy[group];
    const b = policy[contact.UserName];
    return a && b ?
        [Array.from(new Set([...b.role, ...a.role])), Array.from(new Set([...b.scenarioes, ...a.scenarioes]))]
        : (({ roles, scenarioes } = {}) => [roles, scenarioes])(a || b);
}
function pickScenario(possibleScenarios, ask, scenarioKeys) {
    if(!possibleScenarios)
        return 
    possibleScenarios=possibleScenarios.split(",").map(a=>a.trim()).filter(a=>!!a)
    if(possibleScenarios.length==0)
        return

    ask = ask.toLowerCase()
    const i = possibleScenarios
        .map(name => {
            const keys = scenarioKeys[name];
            const n = keys.filter(key => ask.indexOf(key.toLowerCase())!=-1).length;
            return Math.ceil(n * 1000 / keys.length);
        }).reduce((k, a, i, all) => {
            return a < 500 ? k : (a > (all[k] || 0) ? i : k);
        }, -1);
    return possibleScenarios[i];
}