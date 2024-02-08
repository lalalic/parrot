import React from "react";
import * as Linking from "expo-linking";
import { useNavigate } from "react-router-native";

export default function YoutubeShare() {
    //const url=Linking.useURL()
    const url = "parrot://share/?url=https://www.youtube.com/watch?v=gOqitVsRYRE";
    const navigate = useNavigate();
    const getVideoId = React.useCallback(url => {
        url = url.split("?url=")[1];
        const parsed = Linking.parse(decodeURIComponent(url));
        if (!["youtu.be", "www.youtube.com", "youtube.com"].includes(parsed.hostname))
            return;
        return parsed.queryParams.v || parsed.path;
    }, []);
    React.useEffect(() => {
        if (!url)
            return;
        const videoId = getVideoId(url);
        if (!videoId)
            return;
        navigate(`/talk/youtube/general/${videoId}`);
    }, []);
    return null;
}
