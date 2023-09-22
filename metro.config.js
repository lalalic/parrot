// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.splice(0,0,"png")

config.resolver.resolveRequest=function(context, moduleName, platform){
	const original=context.resolveRequest(context, moduleName, platform)
	if (moduleName.endsWith('MaterialCommunityIcons.ttf')) {//asset resolution: {filePaths:[]}
		original.filePaths[0]=original.filePaths[0].replace('MaterialCommunityIcons.ttf','MaterialIcons.ttf')
	}else if(moduleName=="react-native-iaphub"){
		original.filePath=require.resolve("react-native-use-qili/components/iaphub-iap")//require('path').resolve(__dirname,"./src/iaphub/index.js")
	}
	
	// Optionally, chain to the standard Metro resolver.
	return original
}

//chat
//config.resolver.blockList=/MaterialCommunityIcons\.js$/

module.exports = config