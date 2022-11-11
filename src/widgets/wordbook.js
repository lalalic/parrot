import { Media } from "./media"

export default class SpellNamePractice extends Media {
    static defaultProps = {
        ...super.defaultProps,
        id: "wordbook",
        slug: "wordbook",
        title: "extend your vocabulary",
        thumb: require("../../assets/favicon.png"),
        description: "This widget can help to remember word"
    }
}
