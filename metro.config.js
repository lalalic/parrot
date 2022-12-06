// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.splice(0,0,"scn","usdz","obj","mtl","fbx","bin")

module.exports = config
