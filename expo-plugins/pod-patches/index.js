const configPlugin = require("@expo/config-plugins");

module.exports=configPlugin.createRunOncePlugin(function withPermissions(config, {}={}){
    config=configPlugin.withDangerousMod(config, ['ios', async conf=>{
        const fs=require('fs')
        const Podfile = require("path").join( conf.modRequest.platformProjectRoot, 'Podfile' )
        const newLine=`system('bash', '../expo-plugins/pod-patches/patch.sh', "${conf.modRequest.platformProjectRoot}")\n    react_native_post_install`
        const content=fs.readFileSync(Podfile,{encoding:"utf8"})
        if(content.indexOf("pod-patches/patch.sh")==-1){
            fs.writeFileSync(Podfile, content.replace("react_native_post_install", newLine))
            console.log("pod-patches ready")
        }
        return conf
    }])
    return config
},"pod-patches", "1.0")