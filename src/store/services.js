import { Qili as QiliApi } from "react-native-use-qili/store";
import { createApi } from "@reduxjs/toolkit/query/react";
import { XMLParser } from 'fast-xml-parser';
import cheerio from "cheerio";
import FlyMessage from "react-native-use-qili/components/FlyMessage";
const l10n=globalThis.l10n

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


async function fetchTedTalk({slug},api){
	const {my:{lang, mylang}}=api.getState()
	const res=await fetch("https://www.ted.com/graphql",{
		method:"POST",
		headers:{
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		body:JSON.stringify({
			query: `query {
			lang: translation(
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

			mylang: translation(
				videoId: "${slug}"
				language: "${mylang}"
			) {
				paragraphs {
					cues {
						translated: text
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
		
	const {lang: transcript, mylang:translation, video: { playerData, description },}=data
	const {id, resources, title, thumb, duration, speaker, targeting:{tag=""}={}}=JSON.parse(playerData)
	const talk={
		id, slug, title, thumb, duration,description,speaker,source:"ted",tags:tag.split(","),
		video: resources.hls.stream,
		data:transcript?.paragraphs || translation?.paragraphs
	}

	if(talk.data){
		let lastCue=null, offset=100
		talk.data.forEach((p,i)=>{
			p.cues.forEach((cue,j)=>{
				cue.time+=offset
				cue.end=talk.duration*1000+offset
				if(lastCue){
					lastCue.end=cue.time-200
				}
				if(!cue.translated && translation){
					cue.translated=translation.paragraphs[i]?.cues[j]?.translated
					cue.fulltext=`${cue.text}\n\n${cue.translated}`
				}
				lastCue=cue
			})
		})
	}else{
		FlyMessage.show("There's no transcript.")
	}
	return talk
}

async function filterOutNoLang(talks, lang="en"){
	//if(lang.startsWith("en"))
		return talks
	const query=talks.map((a,i)=>`_${i}:video(id:"${a.slug}"){audioInternalLanguageCode}`)
	const res=await fetch("https://www.ted.com/graphql",{
		method:"POST",
		headers:{
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		body:JSON.stringify({
			query: `query {
				${query.join("\n")}
			}`,
		}),
	})
	const {data}=await res.json()
	const exists=Object.values(data)
	return talks.filter((a,i)=>exists[i]?.audioInternalLanguageCode==lang)
}

export const Ted = Object.assign(createApi({
	reducerPath: "ted",
	endpoints: builder => ({
		talk: builder.query({
			queryFn: async ({ slug, id }, api) => {
				const state = api.getState();
				if(id && state.talks[id]){
					return {data:state.talks[id]}
				}

				const talk = await (async () => {
					if (globalThis.Widgets[slug]) {
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
						return await fetchTedTalk({ slug }, api);
					}
				})();

				return { data: talk };
			},
		}),
		talks: builder.query({
			queryFn: async ({ q, page }, api) => {
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
				return { data: { talks: await filterOutNoLang(talks, api.getState().my?.lang), page, pages } };
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
				return { data: talks};
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
				return { data: { talks:await filterOutNoLang(talks, api.getState().my?.lang) } };
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

				return { data: { talks:  await filterOutNoLang(talks, api.getState().my?.lang)} };
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
				if(!api.getState().talks[id]){
					api.dispatch({type:'talk/set', talk})
				}
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
			queryFn: widgetTalks_queryFn,
			providesTags(talks, _, {slug}){
				return [{type:"Talk", slug}]
			}
		}),
		remove: builder.mutation({
			async queryFn({id, type},api){
				const result=await Qili.fetch({
					query: `mutation($id:String!, $type:String){
						remove(id:$id, type:$type)
					}`,
					variables: { type, id }
				})
				return {data:result.remove}
			},
			invalidatesTags(result,_,{slug,id, type}){
				return [
					type=="Widget" ? {type:'Talk', slug } : {type:'Talk'}, 
					{type:'Talk', id}
				]
			}
		}),
		changeTitle: builder.mutation({
			async queryFn({id, title},api){
				const result=await Qili.fetch({
					query: `mutation($id:String!, $title:String!){
						changeWidgetTalkTitle(id:$id, title:$type)
					}`,
					variables: { id,  title}
				})
				return {data:result.changeWidgetTalkTitle}
			},
			invalidatesTags(result,_,{id}){
				return [{type:'Talk', id }]
			}
		})
	})
}), {
	...QiliApi,
	isUploaded(video) {
		return video.indexOf("qili2.com") != -1;
	},
});


export const Services = { Ted, Qili, current: 'Qili' };

export const TalkApi = new Proxy(Services, {
	get(target, key) {
		return target[target.current][key];
	}
});
