import React from "react";
import { TextInput, View, Text, Modal } from "react-native";
import { useStore } from "react-redux";
import PressableIcon from "react-native-use-qili/components/PressableIcon";
import useAsk from "react-native-use-qili/components/useAsk";


export default function PromptAction({ prompt }) {
    const ask = useAsk();
    const store = useStore();
    const [showDialog, setShowDialog] = React.useState(false);
    const apply = React.useCallback(async (params) => {
        const message = prompt.prompt?.(params, store);
        const response = await ask(message); 
        ({ ...prompt, params}).onSuccess({ response, store });
    }, [ask, store]);
    return (
        <>
            <PressableIcon
                name={prompt.name}
                color="blue"
                label={l10n[prompt.label]} labelFade={true}
                onPress={async (e) => {
                    if (prompt.params) {
                        setShowDialog(true);
                    } else {
                        await apply();
                    }
                }} />
            {showDialog && <PromptParamDialog
                style={{ position: "absolute", zIndex: 999, bottom: 10, left: 0 }}
                prompt={prompt} 
                onApply={async (params) => {
                    try {
                        await apply(params);
                    } finally {
                        setShowDialog(false);
                    }
                }}
                onCancel={e => setShowDialog(false)} />}
        </>
    );
}
function PromptParamDialog({ style, prompt: { params, label, initParams }, onApply, onCancel }) {
    const [values, setValues] = React.useState(params);
    const inputStyle = { margin: 5, paddingLeft: 5, flex: 1, borderWidth: 1, height: 30 };
    const paramsUI = React.useMemo(() => {
        const ui = [];
        for (const key in params) {
            if (Object.hasOwnProperty.call(params, key)) {
                const value = values[key];
                ui.push(
                    <View style={{ flexDirection: "row", margin: 5, alignItems: 'center' }} key={key}>
                        <Text style={{ width: 100, color: "black", textAlign: "right" }}>{key.toUpperCase()}</Text>
                        {(() => {
                            if (typeof (value) != "object") {
                                return <TextInput name={key}
                                    style={inputStyle}
                                    placeholder={key}
                                    value={value}
                                    onChangeText={text => setValues({ ...values, [key]: text })} />;
                            } else {
                                return React.cloneElement(value, { setValue: value => setValues({ ...values, [key]: value }) });
                            }
                        })()}
                    </View>
                );
            }
        }
        return ui;
    }, [values]);
    return (
        <Modal visible={true} animationType="slide" transparent={true}>
            <View style={[{ flex:1, justifyContent:"center",  width: "100%"}]}>
                <View style={{ backgroundColor: "white", padding: 4,  }}>
                    <View style={{ alignItems: "center", height: 30, paddingTop: 10 }}>
                        <Text style={{ color: "black" }}>{label.toUpperCase()}</Text>
                    </View>
                    {paramsUI}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingTop: 20 }}>
                        <PressableIcon name="check" style={{ flex: 1 }}
                            onPress={() => onApply(values)} />
                        <PressableIcon name="clear" style={{ flex: 1 }}
                            onPress={() => onCancel(values)} />
                    </View>
                </View>
            </View>
        </Modal>
    );
}
