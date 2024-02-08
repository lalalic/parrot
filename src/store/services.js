import { Qili as QiliApi } from "react-native-use-qili/store";
import { createApi } from "@reduxjs/toolkit/query/react";
import { XMLParser } from 'fast-xml-parser';
import * as FileSystem from "expo-file-system";
import cheerio from "cheerio";
import ytdl from "react-native-ytdl";
import { YoutubeTranscript } from "../experiment/youtube-transcript";
import mpegKit from "../experiment/mpeg"

const TedHeader={
	"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 11_6_8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36",
}

const widgetTalks_queryFn=async (variables,api)=>{
	const data=await Qili.fetch({
		id:"widgetTalks",
		variables:{...variables, lang: api.getState().my.lang}
	})
	data.talks.reverse()
	return {data}
}


async function fetchTedTalk({slug},{lang, mylang}){
	const res=await fetch("https://www.ted.com/graphql",{
		method:"POST",
		headers:{
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		body:JSON.stringify({
			query: `query {
			translation(
				videoId: "${slug}"
				language: "${lang}"
			) {
				paragraphs {
					cues {
						text
						time
					}
				}
			}
				
			video(slug:"${slug}"){
					description
					playerData
				}
			}`,
		}),
	})
	const {data}=await res.json()
		
	const {translation, video: { playerData, description },}=data
	const {id, resources, title, thumb, languages, duration, speaker, targeting:{tag=""}={}}=JSON.parse(playerData)
	const talk={
		id, slug, title, thumb, languages, duration,description,speaker,source:"ted",tags:tag.split(","),
		video: resources.hls.stream,
	}
	
	talk.languages=talk.languages.reduce((langs,a)=>(langs[a.languageCode]=a,langs),{})
	
	if(!translation)
		return talk

	const {paragraphs}=translation
	talk.languages.mine={transcript:paragraphs}
	
	console.assert(resources.hls.metadata)
	const resHlsMeta=await fetch(resources.hls.metadata)
	const hlsMeta=await resHlsMeta.json()
	const offset=hlsMeta.domains.filter(a=>!a.primaryDomain).reduce((sum,a)=>sum+a.duration*1000,0)
	const target=hlsMeta.subtitles.find(a=>a.code.toLowerCase()==mylang)
	
	const nextCue=((vtt,last=0)=>()=>{
		if(!vtt)
			return
		const i0=vtt.indexOf("\n\n",last)
		if(i0==-1)//The last may not have data
			return 
		const i=vtt.indexOf("\n",i0+2)
		try{
			return vtt.substring(i+1, vtt.indexOf("\n", i+1))
		}finally{
			last=i+1
		}
	})(target && await (await fetch(target.webvtt)).text());

	(lastCue=>paragraphs.forEach(p=>p.cues.forEach(cue=>{
		cue.time+=offset
		cue.end=talk.duration*1000+offset
		if(lastCue){
			lastCue.end=cue.time-200
		}
		cue.my=nextCue()
		lastCue=cue
	})))();
	return talk
}

export const Ted = Object.assign(createApi({
	reducerPath: "ted",
	endpoints: builder => ({
		talk: builder.query({
			queryFn: async ({ slug, id }, api) => {
				const state = api.getState();

				const talk = await (async () => {
					const Widget = globalThis.Widgets[slug];

					const { lang = "en", mylang = "zh-cn" } = state.my;

					if (slug == "youtube") {
						debugger;
						/*
						if(state.talks[id]){
							return {id,slug:"youtube"}
						}
						*/
						const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${id}`);
						const format = (formats => {
							/*
							const audios=formats.filter(a=>a.hasAudio && !a.hasVideo && a.container=="mp4" && a.contentLength)
							if(audios.length){
								const i=audios.reduce((k,a,I)=>{
									return parseInt(a.contentLength)<parseInt(audios[k].contentLength) ? I : k
								},0)
								return audios[i]
							}
							*/
							return ytdl.chooseFormat(formats, {
								filter: a => a.hasAudio && a.container == "mp4",
								quality: "lowestvideo",
							});
						})(info.formats);

						const { title, keywords: tags, lengthSeconds, thumbnails: [{ url: thumb }], author: { name: author }, } = info.videoDetails;

						const talk = {
							title, id, slug: `youtube`, source: "youtube", thumb, tags, author,
							video: format.url,
							duration: parseInt(lengthSeconds) * 1000,
						};

						api.dispatch({ type: "talk/set", talk });

						const file = talk.localVideo = `${FileSystem.documentDirectory}${id}/video.mp4`;
						mpegKit.generateAudio({ source: format.url, target: file })
							.then(() => {
								//api.dispatch({type:"talk/set",talk:{id, localVideo:file}})
							})
							.catch(e => {
								console.error(e);
								api.dispatch({ type: "talk/clear", id });
							});

						const transcripts = await YoutubeTranscript.fetchTranscript(id, { lang });
						const myTranscripts = await YoutubeTranscript.fetchTranscript(id, { lang: mylang });
						if (myTranscripts && transcripts.length == myTranscripts.length) {
							transcripts.forEach((cue, i) => cue.my = myTranscripts[i].text);
						}
						if (transcripts) {
							transcripts.forEach(cue => {
								cue.time = cue.offset;
								delete cue.offset;
								cue.end = cue.time + cue.duration;
								delete cue.duration;
							});
						}
						talk.languages = { mine: { transcript: [{ cues: transcripts }] } };
						api.dispatch({ type: "talk/set", talk });

						return { id, slug: "youtube" };
					} else if (Widget) {
						if (id && !state.talks[id]) {
							const { talk } = await Qili.fetch({
								id: "talk",
								variables: {
									slug: "Widget",
									id
								}
							});
							return talk;
						}
					} else {
						return await fetchTedTalk({ slug }, { lang, mylang });
					}
				})();

				//talk && api.dispatch({type:"talk/set", talk})
				return { data: talk };
			},
		}),
		talks: builder.query({
			queryFn: async ({ q, page }, api) => {
				const { lang } = api.getState().my;
				let minutes = 0;
				q = q.replace(/((\d+)\s*minutes)/ig, (full, $1, $2) => (minutes = parseInt($2), "")).trim();

				const query = [
					minutes > 0 && `duration=${(Math.ceil(minutes / 6) - 1) * 6}-${Math.ceil(minutes / 6) * 6}`,
					!!q ? "sort=relevance" : "sort=newest",
					!!q && `q=${encodeURI(q)}`,
					page > 1 && `page=${page}`
				].filter(a => !!a).join("&");

				const res = await fetch(`https://www.ted.com/talks${!!query ? `?${query}` : ""}`, TedHeader);
				const data = await res.text();
				const $ = cheerio.load(data);
				const talks = $("#browse-results .media").map((i, el) => {
					const $el = $(el);
					const link = $el.find("a.ga-link").last();
					return {
						title: link.text(),
						slug: link.attr("href").split("/").pop(),
						thumb: $el.find('img').attr('src'),
						duration: (([m, s]) => parseInt(m) * 60 + parseInt(s))($el.find('.thumb__duration').text().split(":"))
					};
				}).toArray();
				const pages = parseInt($("#browse-results>.results__pagination .pagination__item").last().text()) || 1;
				return { data: { talks, page, pages } };
			},
		}),

		people: builder.query({
			queryFn: async ({ q }, api) => {
				const res = await fetch(`https://www.ted.com/search?cat=people&q=${encodeURI(q)}`, TedHeader);
				const data = await res.text();

				const $ = cheerio.load(data);
				const talks = $(".search-results .search__result").map((i, el) => {
					const $el = $(el);
					const link = $el.find("h3>a.ga-link").first();
					return {
						name: link.text().split("|")[0].trim(),
						slug: link.attr("href").split("/").pop(),
						thumb: $el.find('img').attr('src'),
						desc: $el.find('.search__result__description').text(),
					};
				}).toArray();
				return { data: talks };
			}
		}),
		speakerTalks: builder.query({
			queryFn: async ({ q }, api) => {
				const res = await fetch(`https://www.ted.com/speakers/${q}`, TedHeader);
				const data = await res.text();
				const $ = cheerio.load(data);
				const talks = $("#talks .media").map((i, el) => {
					const $el = $(el);
					const link = $el.find("a.ga-link").last();
					return {
						title: link.text(),
						slug: link.attr("href").split("/").pop(),
						thumb: $el.find('img').attr('src'),
						duration: (([m, s]) => parseInt(m) * 60 + parseInt(s))($el.find('.thumb__duration').text().split(":"))
					};
				}).toArray();
				return { data: { talks } };
			}
		}),
		today: builder.query({
			queryFn: async (day, api) => {
				const res = await fetch("http://feeds.feedburner.com/TEDTalks_audio", {
					headers: {
						"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_6_8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36",
					},
				});
				const data = await res.text();
				const { rss } = new XMLParser({
					ignoreAttributes: false,
					attributeNamePrefix: "",
					removeNSPrefix: true,
					textNodeName: "value",
				}).parse(data);
				const slug = (link, i = link.lastIndexOf("/"), j = link.indexOf("?")) => link.substring(i + 1, j);
				const toSec = dur => {
					const [h, m, s] = dur.split(":").map(a => parseInt(a));
					return (h * 60 + m) * 60 + s;
				};
				const talks = rss?.channel.item.map(({ title, talkId: id, duration, thumbnail, link }) => {
					return { id, title, duration: toSec(duration), thumb: thumbnail.url, slug: slug(link) };
				}).filter(a => !!a.duration);
				return { data: { talks } };
			},
		}),
		widgetTalks: builder.query({
			queryFn: widgetTalks_queryFn,
			serializeQueryArgs({ queryArgs }, b) {
				debugger;
				return queryArgs;
			}
		})
	})
}), {
	testNetwork(state) {
		const { lang = "en", mylang = "zh-cn" } = state.my;
		return Promise.all([
			fetchTedTalk({ slug: `noah_raford_how_gaming_can_be_a_force_for_good` }, { lang, mylang })
				.then(talk => !!talk.languages),
			fetch(`https://www.ted.com/talks`).then(res => res.text())
		]);
	},
	supportLocal(talk) {
		return talk.video && talk.video.startsWith("http");
	}
});

export const Qili = Object.assign(createApi({
	reducerPath: "qili",
	tagTypes: ["Talk", "User"],
	endpoints: builder => ({
		talk: builder.query({
			queryFn: async ({ slug, id }, api) => {
				const { talk } = await Qili.fetch({
					id: "talk",
					variables: { slug, id }
				});
				return { data: talk || { id } };
			},
			providesTags: talk => {
				return [{ type: "Talk", id: talk.id }];
			}
		}),
		talks: builder.query({
			queryFn: async ({ q = "", page }, api) => {
				const { lang } = api.getState().my;
				let minutes = 0;
				q = q.replace(/((\d+)\s*minutes)/ig, (full, $1, $2) => (minutes = parseInt($2), "")).trim();

				const data = await Qili.fetch({
					id: "talks",
					variables: { q, lang }
				});
				data.talks.reverse();
				return { data };
			},
			providesTags: () => ['Talk']
		}),
		people: builder.query({
			queryFn: async ({ q }, api) => {
				const { people } = await Qili.fetch({
					id: "people",
					variables: { q }
				});
				return { data: people };
			}
		}),
		speakerTalks: builder.query({
			queryFn: async ({ q }, api) => {
				const data = await Qili.fetch({
					id: "speakerTalks",
					variables: { q }
				});
				data.talks.reverse();
				return { data };
			},
			providesTags: () => ['Talk']
		}),
		today: builder.query({
			queryFn: async (day, api) => {
				const data = await Qili.fetch({
					id: "today"
				});
				data.talks.reverse();
				return { data };
			},
			providesTags: () => [{ type: "Talk", id: "today" }]
		}),
		widgetTalks: builder.query({
			queryFn: widgetTalks_queryFn
		})
	})
}), {
	...QiliApi,
	isUploaded(video) {
		return video.indexOf("qili2.com") != -1;
	},
});


export const Services = { Ted, Qili, current: 'Ted' };

export const TalkApi = new Proxy(Services, {
	get(target, key) {
		return target[target.current][key];
	}
});
