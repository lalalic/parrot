const ExpoConfig = require("@expo/config");

const { exp } = ExpoConfig.getConfig(".", {
	skipSDKVersionRequirement: true,
	isPublicConfig: true,
});

function toDateTimeInt(d) {
	const pad = (i) => String(i).padStart(2, "0");
	return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(
		d.getHours()
	)}${pad(d.getMinutes())}`;
}

const {version}= require("../package.json")
const [,,root="dist"]=process.argv

const folder=`${root}/${version}/${toDateTimeInt(new Date())}`
const expoExport=`expo export --experimental-bundle --output-dir ${folder}`
console.log(expoExport)
require('child_process').execSync(`expo export --experimental-bundle --output-dir ${folder}`)

console.log("output expo config")
require("fs").writeFileSync(`${folder}/expoConfig.json`, JSON.stringify(exp))
