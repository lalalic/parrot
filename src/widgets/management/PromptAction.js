import React from "react";
import { TextInput, View, Text, Modal } from "react-native";
import { useStore } from "react-redux";
import PressableIcon from "react-native-use-qili/components/PressableIcon";
import { ask } from "react-native-use-qili/components/predict";
import Switch from "react-native-use-qili/components/Switch"


export default function PromptAction({ prompt }) {
    const store = useStore();
    const [showDialog, setShowDialog] = React.useState(false);
    const apply = React.useCallback(async (params) => {
        const message = prompt.prompt?.(params, store);
        const response = await ask(message); 
        await ({ ...prompt, params}).onSuccess({ response, store});
    }, [store]);
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
function PromptParamDialog({ prompt: { params, label }, onApply, onCancel }) {
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
                            if(React.isValidElement(value)){
                                return React.cloneElement(value, { setValue: value => setValues({ ...values, [key]: value }) });
                            }else if(typeof(value)=="boolean"){
                                return <Switch value={value} 
                                    onValueChange={e=>setValues({...values, [key]:!value})}/>
                            }else{
                                return <TextInput name={key}
                                    style={inputStyle}
                                    placeholder={key}
                                    {...(typeof (value) != "object" ? {value} : value||{})}
                                    onChangeText={text => setValues({ ...values, [key]: text })} />;
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
