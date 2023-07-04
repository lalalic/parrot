function diffusion(){
    const session_hash=Math.random().toString(36).substring(2)
    const hash={session_hash,fn_index: 2}
    return {
        generate(prompt){
            return new Promise((resolve,reject)=>{
                const ws=new WebSocket("wss://runwayml-stable-diffusion-v1-5.hf.space/queue/join")

                ws.onmessage=function(event){
                    const {msg, output} = JSON.parse(event.data);
                    switch (msg) {
                    case "send_data":
                        ws.send(JSON.stringify({
                            ...hash,
                            data:[prompt],
                        }))
                        break;
                    case "send_hash":
                        ws.send(JSON.stringify(hash));
                        break;
                    case "process_completed":
                        resolve(output.data[0])
                        return;
                    case "queue_full":
                        return;
                    case "estimation":
                        break;
                    case "process_generating":
                        break;
                    case "process_starts":
                        break
                    }
                }
            })
        }
    }
}