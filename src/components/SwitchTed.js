import React from "react";
import { Switch } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { isAdmin } from "react-native-use-qili/store";

export default function SwitchTed({style}) {
    const dispatch = useDispatch();
    const [bAdmin, setIsAdmin] = React.useState(false);
    React.useEffect(() => {
        fetch("https://ted.com").then(async (res) => {
            if (res.ok) {
                setIsAdmin(await isAdmin());
            } else {
                dispatch({ type: "my/api", api: "Qili" });
            }
        });
    }, []);
    const { api, lang } = useSelector(state => state.my);

    if (!bAdmin)
        return null;

    return (
        <Switch value={api == "Ted"}
            style={[{ transform: [{ scale: 0.5 }], alignSelf: "center" },style]}
            onValueChange={e => dispatch({ type: "my/api", api: api == "Ted" ? "Qili" : "Ted" })} />
    );
}
