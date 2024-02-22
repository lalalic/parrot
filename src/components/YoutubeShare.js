import React from "react";
import * as Linking from "expo-linking";
import { useNavigate } from "react-router-native";

export default function YoutubeShare() {
    const url=Linking.useURL()
    //const url = "parrot://share/?url=https://www.youtube.com/watch?v=gOqitVsRYRE";
    const navigate = useNavigate();
    React.useEffect(() => {
        if (!url)
            return;
        const link = url.split("?url=")[1];
        const parsed = Linking.parse(decodeURIComponent(link));
        if (!["youtu.be", "www.youtube.com", "youtube.com"].includes(parsed.hostname))
            return;
        const videoId=parsed.queryParams.v || parsed.path;
        if (!videoId)
            return;
        navigate(`/talk/youtube/general/${videoId}`);
    }, [url]);
    return null;
}
