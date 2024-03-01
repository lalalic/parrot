import React from 'react';
import { View, Text, Pressable, FlatList } from "react-native";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigate, useParams } from "react-router-native";
import { ColorScheme } from 'react-native-use-qili/components/default-style';
import PressableIcon from "react-native-use-qili/components/PressableIcon";
import PolicyIcons from '../PolicyIcons';


export default function PlayButton({ size = 24, style, color, showPolicy = false, onPress, name, ...props }) {
    const navigate = useNavigate();
    const scheme = React.useContext(ColorScheme);
    const { slug, policy = "general" } = useParams();
    const [showPolicyList, setShowPolicyList] = React.useState(false);

    const squareSize = size;

    return (
        <View {...props}>
            <View style={{
                width: squareSize, height: squareSize, borderRadius: squareSize / 2, borderWidth: 1,
                borderColor: "white", justifyContent: "center", alignItems: "center"
            }}>
                {showPolicy && !!policy && policy != "general" && (
                    <View style={{ position: "absolute", width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }}>
                        <MaterialIcons size={size / 1.5} name={PolicyIcons[policy]} />
                    </View>
                )}
                <PressableIcon size={size} name={name} color={color}
                    style={{ opacity: !!policy && policy != "general" ? 0.4 : 1 }}
                    onPress={e => {
                        if (showPolicyList) {
                            setShowPolicyList(false);
                        } else if (onPress) {
                            onPress(e);
                        } else {
                            setShowPolicyList(!showPolicyList);
                        }
                    } }/>

            </View>

            {showPolicyList && <FlatList style={{ position: "absolute", bottom: 40, left: -20, width: 200, padding: 10, backgroundColor: scheme.backgroundColor }}
                data={["general", "retelling", "dictating", "shadowing"]}
                renderItem={({ index, item }) => (
                    <Pressable style={{ flexDirection: "row", height: 40 }}
                        onPress={e => {
                            setShowPolicyList(false);
                            navigate(`/talk/${slug}/${item}`, { replace: true });
                        } }>
                        <MaterialIcons name={PolicyIcons[item]} size={32} color={policy == item ? scheme.primary : undefined} />
                        <Text style={{ marginLeft: 10, lineHeight: 32 }}>{(index == 0 ? "Test" : item).toUpperCase()}</Text>
                    </Pressable>
                )} />}
        </View>
    );
}
