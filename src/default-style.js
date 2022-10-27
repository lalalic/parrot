import {Text, TextInput} from "react-native"

export default (style={}) => {
    const components = [Text, TextInput]
    return 
    const customProps = {
        style: {
            color:"white",
            ...style,    
        }
    }

    for(let i = 0; i < components.length; i++) {
        debugger
        const TextRender = components[i].render;
        const initialDefaultProps = components[i].defaultProps;
        components[i].defaultProps = {
            ...initialDefaultProps,
            ...customProps,
        }
        components[i].render = function render() {
            debugger
            const oldProps = this.props;
            arguments[0]=this.props = { ...this.props, style: [customProps.style, this.props.style] };
            try {
                return TextRender.apply(this, arguments);
            } finally {
                this.props = oldProps;
            }
        };
    }
}