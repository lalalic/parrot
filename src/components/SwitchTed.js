import React from "react";
import { Switch } from "react-native";
import { useDispatch, useSelector } from "react-redux";

export default function SwitchTed({style}) {
    const dispatch = useDispatch();
    React.useEffect(() => {
        fetch("https://ted.com").then(async (res) => {
            if (!res.ok) {
                dispatch({ type: "my/api", api: "Qili" });
            }
        });
    }, []);
    const { api} = useSelector(state => state.my);

    return (
        <Switch value={api == "Ted"}
            style={[{ transform: [{ scale: 0.5 }], alignSelf: "center" },style]}
            onValueChange={e => dispatch({ type: "my/api", api: api == "Ted" ? "Qili" : "Ted" })} />
    );
}
