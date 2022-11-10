import { Media } from "../components";

export default class SpellNamePractice extends Media {
    static defaultProps = {
        ...Media.defaultProps,
        id: "wordbook",
        slug: "wordbook",
        title: "extend your vocabulary",
        thumb: require("../../assets/favicon.png"),
        description: "This widget can help to remember word"
    };
}
