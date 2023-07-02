window.emit=(event, data)=>chrome.runtime.sendMessage({event,data})
            
window.imgToDataURI=(image)=>{
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    context.drawImage(image, 0, 0)
    return canvas.toDataURL()
}
window.emit('emit.imgToDataURI')

chrome.runtime.onMessage.addListener(({type:event, ...action})=>{
    switch(event){
        case "fnCall":{
            ;(async ({fnKey, args, session})=>{
                console.debug(`session[${session}] received`)
                const result=await Promise.resolve(window.HelloBro[fnKey](...args))
                window.emit(event, {id:session, result})
                console.debug(`session[${session}] done`)
            })(action);
            break
        }
    }
})

const bro=injectBro()

if('init' in bro){
    bro.init()
}

window.emit('bro', !! bro);