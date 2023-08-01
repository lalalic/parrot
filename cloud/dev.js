const qili="../../qili"
require(`${qili}/dev`)({
    conf:{
        ...require("./qili.conf.js"),
        graphiql:true,
        isDev:true,
        testLoginCode:"1234"
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
        bridge:{
            ...require("../../qili-web-bridge/qili.conf")
        }
    }
})