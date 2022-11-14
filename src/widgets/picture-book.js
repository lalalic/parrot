import { ListMedia } from "./media"

export default class PictureBook extends ListMedia {
    static defaultProps = {
        ...super.defaultProps,
        id: "picturebook",
        slug: "picturebook",
        title: "Recognize your world",
        thumb: require("../../assets/widget-picture-book.jpeg"),
        description: "Recognize everything in your world",
    }

    title(){
        return this.props.tag
    }

    static Management=props=><ListMedia.Tags talk={this.defaultProps} placeholder="Tag: to categorize your picture book" {...props}/>
}
