export default {
	general: {
		desc: "options to control player and reaction",
		record: false,//record my audio
		visible: true,//show video or not
		caption: true,//show caption or not
		captionDelay: 0,//caption delay time
		autoChallenge:60,//add chunk into challenges if the percentage of identified text matching the original chunk text is lower than the value
		speed: 1,
		whitespace: 0, //whitespace time to start next,0:no whitespace
		chunk: 0, //0:chunck by chunck, n: chunks totally n seconds, 7: paragraph, 10: whole
		fullscreen: false,//
		autoHide: true,//hide action bar or not
	},
	shadowing: {
		desc: "options when shadowing chunk by chunk",
		record: true,
		whitespace: 1,
		chunk: 0,
	},
	dictating: {
		desc: "options when shadowing chunks by chunks",
		record: true,
		captionDelay: 1,
		whitespace: 1,
		chunk: 1, //1s
	},
	retelling: {
		desc: "options when shadowing paragraph by paragraph",
		record: true,
		captionDelay: 1,
		whitespace: 1,
		chunk: 7, //paragraph
	},
}