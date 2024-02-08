import React from "react";


export function Delay({ children, seconds }) {
    const [content, setContent] = React.useState(null);

    React.useEffect(() => {
        if (seconds) {
            setContent(null);
            setTimeout(() => setContent(children), seconds * 1000);
        } else {
            setContent(children);
        }
    }, [children, seconds]);
    return content;
}
