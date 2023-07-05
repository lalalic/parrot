// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.splice(0,0,"scn","usdz","obj","mtl","fbx","bin","tflite","txt","wav","mlmodelc","mp3")

config.resolver.resolveRequest=function(context, moduleName, platform){
	const original=context.resolveRequest(context, moduleName, platform)
	if (moduleName.endsWith('MaterialCommunityIcons.ttf')) {//asset resolution: {filePaths:[]}
		original.filePaths[0]=original.filePaths[0].replace('MaterialCommunityIcons.ttf','MaterialIcons.ttf')
	}else if(moduleName.endsWith("chrome-extension")){
		const fs=require('fs')
		const codes=[]
		const uris=require("./chrome-extension/manifest.json")
			.content_scripts
			.reduce((uris, a)=>{
				const name=a.js[0].replace(".js","").split("/").pop()
				uris.push(`${name} : "${a.matches[0]}"`)
				const code=fs.readFileSync(`./chrome-extension/${a.js[0]}`,{encoding:"utf8"})
					.replace("function", "export function")
					.replace("injectBro", name)
				codes.push(code)
				return uris 
			},[])

		const services=[]
		fs.readdirSync("./chrome-extension/services",{encoding:'utf8'})
			.forEach(a=>{
				const [name]=a.split(".")
				const code=fs.readFileSync(`./chrome-extension/services/${a}`,{encoding:"utf8"})
				codes.push(code)
				services.push(name)
			})

		fs.writeFileSync("./chrome-extension/index.js", `
			${codes.join("\n")}
			export const uris={
				${uris.join(",\n")}
			}
			export const services={
				${services.join(",\n")}
			}

			export function subscriptAsHelper({helper, chrome, window, Qili}){
				${fs.readFileSync("./chrome-extension/background.js")}
			}
		`)
	}
	// Optionally, chain to the standard Metro resolver.
	return original
}

//chat
//config.resolver.blockList=/MaterialCommunityIcons\.js$/

module.exports = config
