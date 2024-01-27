const qili="../../qili"
require(`${qili}/dev`)({
    conf:{
        ...require("./qili.conf.js"),
        graphiql:true,
        isDev:true,
    },
    
    apiKey:"parrot", 
    vhost:"qili2.com",
    dbpath:"../qili/test/mongo",
    credentials:(()=>{
        const fs=require('fs')
        const path=require('path')
        return {
            key: fs.readFileSync(path.resolve(__dirname,`${qili}/certs/privkey.pem`), 'utf8'), 
            cert: fs.readFileSync(path.resolve(__dirname,`${qili}/certs/cert.pem`), 'utf8')
        }
    })(),

    services:{
        //bridge:require("../../qili-web-bridge/dev.js").conf,
        ai:{
            ...require("../../qili-ai/qili.conf.js"),
            root:`/Users/lir/Workspace/qili-ai/www/public`,
            graphiql:true,
            isDev:true,
            bucket:"/static",
            watches: /^magic\/.*\.js$/
        }
    }
})