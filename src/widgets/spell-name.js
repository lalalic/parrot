import { Media } from "../components";

export default class SpellNamePractice extends Media {
    static defaultProps = {
        ...Media.defaultProps,
        id: "spellName",
        slug: "spellName",
        title: "Practice Spelling Name",
        thumb: require("../../assets/favicon.png"),
        description: "This widget will give your name, and you have to spell it"
    };
}
