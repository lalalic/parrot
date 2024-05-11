const qili="../../qili"
require(`${qili}/dev`)({
    conf:{
        ...require("./qili.conf.js"),
        graphiql:true,
        isDev:true,
        bucket:"/static",
    },
    apiKey:"parrot", 
    vhost:"qili2.com",
    dbpath:"../qili/test/mongo/3",
    logmongo:false,
    credentials:(()=>{
        const fs=require('fs')
        const path=require('path')
        return {
            key: fs.readFileSync(path.resolve(__dirname,`${qili}/certs/privkey.pem`), 'utf8'), 
            cert: fs.readFileSync(path.resolve(__dirname,`${qili}/certs/cert.pem`), 'utf8')
        }
    })(),
    services:{
        ai:{
            ...require("../../qili-ai/qili.conf.js"),
            root:`/Users/lir/Workspace/qili-ai/www/public`,
            graphiql:true,
            isDev:true,
            bucket:"/static",
            watches: /\.js$/
        }
    }
})