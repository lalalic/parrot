/* babel-ignore */
module.exports=function injectBro(){
    return window.HelloBro={
        init(){
            window.emit("status", "load")
        },
        generate(prompt,timeout=60000){
            const root=document.querySelector('gradio-app').shadowRoot
            return new Promise((resolve,reject)=>{
                const observer = new MutationObserver((mutationsList, observer) => {
                    for(let i=0; i<mutationsList.length; i++){
                        let mutation=mutationsList[i]
                        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                            if(mutation.target.getAttribute('class').indexOf('opacity-0')!=-1){
                                observer.disconnect()
                                clearTimeout(timer)
                                const images=Array.from(root.querySelectorAll('#gallery img'))
                                resolve(images.map(a=>a.src))
                                break
                            }
                        }
                    }
                });

                observer.observe(root.querySelector('#gallery>div:first-child'), {
                    attributes:true, attributeFilter:["class"],
                })

                root.querySelector('input').value=prompt
                root.querySelector('button').click()

                const timer=setTimeout(()=>{
                    observer.disconnect()
                    reject()
                },timeout)
            })
        }
    }
}