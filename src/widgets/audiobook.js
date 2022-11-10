import { Media } from "../components";

export default class SpellNamePractice extends Media {
    static defaultProps = {
        ...Media.defaultProps,
        id: "audiobook",
        slug: "audiobook",
        title: "record audio as your language material",
        thumb: require("../../assets/favicon.png"),
        description: "This widget will help you to manage your audio book"
    };
}
