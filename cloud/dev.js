module.exports={
    ...require("./qili.conf.js"),
    appUpdates:{
        UPDATES:`${__dirname}/cloud/www/updates`,
        HOSTNAME({runtimeVersion, platform, assetFilePath}){
            const [,uri]=assetFilePath.split(runtimeVersion)
            return `http://localhost:9080/1/parrot/static/updates/${runtimeVersion}${uri}`
        }
    },
    bucket:"http://localhost:9080/1/parrot/static/upload",
}


require("../../qili/dev")({conf:module.exports, apiKey:"parrot"})