/* babel-ignore */
export default function inject(){
    return window.HelloBro={
        init(){
            window.emit("status", "load")
        },
        generate(prompt,timeout=60000){
            const root=document.querySelector('gradio-app').shadowRoot
            return new Promise((resolve,reject)=>{
                root.querySelector('input').value=prompt
                root.querySelector('button').click()
                const $gallery=root.querySelector('#gallery')
                const observer = new MutationObserver((mutationsList, observer) => {
                    for(let i=0; i<mutationsList.length; i++){
                        let mutation=mutationsList[i]
                        if (mutation.type === 'childList') {
                            const images=Array.from($gallery.querySelectorAll('img'))
                            if(images.length>=4){
                                clearTimeout(timer)
                                observer.disconnect()
                                resolve(images.map(a=>a.src))
                                break
                            }
                        }
                    }
                });

                observer.observe($gallery, {
                    childList: true,
                    subtree: true
                })

                const timer=setTimeout(()=>{
                    observer.disconnect()
                    reject()
                },timeout)
            })
        }
    }
}