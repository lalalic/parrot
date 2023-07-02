require('dotenv').config()
const ExpoConfig = require("@expo/config");
const FormData = require("form-data");

const fetch = require("node-fetch2");

const { version } = require("../package.json");
let platform = "ios";
const token = process.env['QILI_TOKEN']

const cwd = process.cwd();
const [, , root = "dist"] = process.argv;
const folder = `${root}/${version}/${toDateTimeInt(new Date())}`;

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

function exportUpdate() {
	const expoExport = `expo export --experimental-bundle --output-dir ${folder}`;
	console.log(expoExport);
	require("child_process").execSync(
		`expo export --experimental-bundle --output-dir ${folder}`
	);

	console.log("output expo config");
	require("fs").writeFileSync(
		`${folder}/expoConfig.json`,
		JSON.stringify(exp)
	);
}

async function createManifest({ downloadURL }) {
	const {
		FileSystemUpdatesStorage,
		manifest,
	} = require("expo-updates-server");
	const storage = new (class extends FileSystemUpdatesStorage {
		constructor() {
			super(...arguments);
			this.getLatestUpdateBundlePathForRuntimeVersionAsync = () =>
				`${process.cwd()}/${folder}`;
		}
	})({
		HOSTNAME() {
			return downloadURL(...arguments);
		},
	});

	console.log(`creating updating manifest for latest ${version}`);
	const VOID = () => 1;
	return new Promise((resolve) => {
		manifest(storage)(
			new Proxy(
				{
					method: "GET",
					headers: {
						"expo-protocol-version": 0,
						"expo-platform": platform,
						"expo-runtime-version": version,
					},
				},
				{ get: (target, key) => target[key] || VOID }
			),
			new Proxy(
				{
					write(buffer) {
						const content = new String(buffer);
						const i0 = content.indexOf(`{"id":"`);
						const ix = content.indexOf(`-----------`, i0);
						const data = content.substring(i0, ix);
						console.log(`output manifest`);
						resolve(JSON.parse(data));
					},
				},
				{ get: (o, k) => o[k] || VOID }
			)
		);
	});
}

async function fetchQili(request) {
	const res = await fetch("https://api.qili2.com/1/graphql", {
		method: "post",
		headers: {
			"Content-Type": "application/json",
			"x-application-id": "parrot",
			"x-session-token": token,
		},
		body: JSON.stringify(request),
	});
	const { data } = await res.json();
	return data;
}

async function upload(assets) {
	const { keys, querys, variables } = assets.reduce(
		(all, asset, i) => {
			const k = `key${i}`;
			all.keys.push(k);
			all.querys.push(`
			token${i}:file_upload_token(key:$${k}){
				token
				key
			}
		`);
			all.variables[k] = `updates/${version}/${asset.key}`;

			return all;
		},
		{ keys: [], querys: [], variables: {} }
	);

	const query = `query a(${keys.map((k) => `$${k}:String`).join(",")}){
		${querys.join("\n")}
	}`;

	const tokens = Object.values(await fetchQili({ query, variables }));
	return Promise.allSettled(
		assets.map(async (asset, i) => {
			const form = new FormData();
			form.append(
				"file",
				require("fs").createReadStream(
					`${cwd}/${folder}/${asset.filePath}`
				)
			);
			Object.entries(tokens[i]).forEach(([key, value]) =>
				form.append(key, value)
			);
			return (function work(){
				return fetch("https://up.qbox.me", {
					method: "post",
					body: form,
				})
				.then(res=>res.json())
				.then(a=>console.log(`uploaded ${asset.filePath}`))
				.catch(a=>{
					console.error(a.message)
					console.log(`try one more time uploading ${asset.filePath}`)
					work()
				})
			})();
		})
	)
}

async function moveFilesRecursively(sourceDir, destinationDir) {
	const fs = require("fs");
	const path = require("path");
	await new Promise(resolve=>fs.readdir(sourceDir, async (err, files) => {
		if (err) {
			console.error("Error reading source directory:", err);
			resolve()
			return;
		}

		await Promise.all(files.map(async (item) => {
			const sourcePath = path.join(sourceDir, item);

			// Get the item's stats
			return new Promise(resolve=>fs.stat(sourcePath, async (err, stats) => {
				if (err) {
					console.error("Error getting file stats:", err);
					resolve()
					return;
				}

				if (stats.isDirectory()) {
					// Recursively move files from subdirectory
					await moveFilesRecursively(sourcePath, destinationDir, true);
				} else {
					// Move the file to the destination directory
					const destinationPath = path.join(destinationDir, item);
					await new Promise((resolve)=>fs.rename(sourcePath, destinationPath, resolve))
				}
				resolve()
			}))
		}))
		resolve()
	}))
}

(async () => {
	platform = "ios";
	exportUpdate();
	const manifest = await createManifest({ 
		downloadURL({ runtimeVersion, platform, assetFilePath }){
			return `https://cdn.qili2.com/parrot/updates/${runtimeVersion}/${assetFilePath.split(/[\/\\]/g).pop()}`
		} 
	});

	require("fs").writeFileSync(
		`${folder}/../${platform}-manifest.json`,
		JSON.stringify(manifest)
	)

	const {assets, launchAsset}=manifest
	//upload version/asset.key
	await upload([
		...assets.map(a=>({...a, filePath:`assets/${a.key}`})),
		{ ...launchAsset, key: `${platform}-${launchAsset.key}.js`, filePath:`bundles/${platform}-${launchAsset.key}.js` },
		{key:`${platform}-manifest.json`, filePath:`../${platform}-manifest.json`}
	]);

	await moveFilesRecursively(folder, `${folder}/..`);
	await new Promise(resolve=>require('fs').rm(folder, {recursive:true, maxRetries:2}, resolve))
	console.log(`done: total ${assets.length+2} uploaded`)
})();
