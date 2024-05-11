const configPlugin = require("@expo/config-plugins");

module.exports=configPlugin.createRunOncePlugin(function withPermissions(config, props={}){
    config=configPlugin.withDangerousMod(config, ['ios', async conf=>{
        const fs=require('fs')
        const Podfile = require("path").join( conf.modRequest.platformProjectRoot, 'Podfile' )
        const newLine="system('bash', '../pod-patches/patch.sh')\n    react_native_post_install"
        const content=fs.readFileSync(Podfile,{encoding:"utf8"})
        if(content.indexOf("pod-patches/patch.sh")==-1){
            fs.writeFileSync(Podfile, content.replace("react_native_post_install", newLine))
        }
        return conf
    }])

    //configPlugin.AndroidConfig.Permissions.withPermissions("android.permission.PhotoLibrary")
    return config
},"wechat-bot", "1.0")