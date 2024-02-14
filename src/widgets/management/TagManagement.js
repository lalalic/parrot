import React from 'react';
import { View, Text, TextInput, FlatList, Pressable } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from 'react-router-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { selectWidgetTalks, TalkApi } from "../../store";
import PromptAction from './PromptAction';
import PressableIcon from "react-native-use-qili/components/PressableIcon";
import ChangableText from "react-native-use-qili/components/ChangableText";
import Loading from "react-native-use-qili/components/Loading";
import { ColorScheme } from 'react-native-use-qili/components/default-style';
import { l10n, TaggedListMedia } from '../media';


export default function TagManagement({ talk, placeholder, onCreate, slug = talk.slug, dispatch = useDispatch(), ...props }){
    const talks = useSelector(state => selectWidgetTalks(state, slug));
    return (
        <TagList
            data={talks} slug={slug} placeholder={l10n[placeholder || `Create new ${talk.title}`]}
            onEndEditing={({ nativeEvent: { text: title } }) => {
                title = title.trim();
                if (!title || -1 !== talks.findIndex(a => a.title == title)) {
                    return;
                }

                if (onCreate) {
                    onCreate({ title, slug }, dispatch);
                } else {
                    TaggedListMedia.create({ title, slug, data: [] }, dispatch);
                }
            }}
            renderItemText={item => item.title}
            {...props} />
    );
};
function TagList({ data, slug, onEndEditing, navigate = useNavigate(), children, iconWidth = 50, actions, prompts, renderItemExtra = ({ item }) => {
    if (item.isLocal !== true) {
        return (
            <View style={{ width: iconWidth, alignContent: "center", alignItems: "center" }}>
                <MaterialIcons name="keyboard-arrow-right" />
            </View>
        );
    }
    return (
        <PressableIcon name="keyboard-arrow-right"
            onPress={e => navigate(`/widget/${item.slug}/${item.id}`)}
            style={{ width: iconWidth }} />
    );
}, renderItemText = a => a.id, dispatch = useDispatch(), renderItem: renderItem0 = function ({ item, id = item.id }) {
    const text = renderItemText(item);
    const textStyle = { fontSize: 16, color: "white" };
    const containerStyle = { height: 50, justifyContent: "center", border: 1, borderBottomColor: color.inactive };
    if (item.isLocal !== true) { //remote
        return (
            <Pressable style={[containerStyle, { flexDirection: "row", alignItems: "center", marginTop: 2 }]}
                onPress={e => navigate(`/talk/${slug}/shadowing/${id}`)}
                key={id}>
                <View style={{ width: iconWidth, alignItems: "center" }}>
                    <MaterialIcons name="cloud-circle" />
                </View>
                <Text style={[{ flexGrow: 1 }, textStyle]}>{text}</Text>
                {renderItemExtra?.(...arguments)}
            </Pressable>
        );
    }

    return ( //local
        <View style={{ flexDirection: "row", marginTop: 2 }} key={id}>
            <PressableIcon name="remove-circle-outline" onPress={e => dispatch({ type: "talk/clear", id })} style={{ width: iconWidth }} />
            <ChangableText style={[containerStyle, { flexGrow: 1 }]}
                text={{ style: textStyle, value: text }}
                onPress={e => navigate(item.data?.length ? `/talk/${slug}/shadowing/${id}` : `/widget/${item.slug}/${item.id}`)}
                onChange={title => dispatch({ type: "talk/set", talk: { id, title } })} />
            {renderItemExtra?.(...arguments)}
        </View>
    );
}, placeholder, inputProps: { style: inputStyle, ...inputProps } = {}, listProps: { style: listStyle, renderItem = renderItem0, ...listProps } = {}, style, ...props }) {
    const color = React.useContext(ColorScheme);

    const { data: { talks = [] } = {}, isLoading } = TalkApi.useWidgetTalksQuery({ slug });

    const all = React.useMemo(() => {
        const locals = data.map(a => a.id);
        return [
            ...data.map(a => ({ ...a, isLocal: true })).sort(),
            ...talks.filter(a => locals.indexOf(a.id) == -1).sort((a, b) => {
                const aTitle = a.title.toUpperCase(), bTitle = b.title.toUpperCase();
                return aTitle < bTitle ? -1 : (aTitle > bTitle ? 1 : 0);
            })
        ];
    }, [data, talks]);

    return (
        <View style={[{ flex: 1, marginTop: 10, minHeight: 200 }, style]} {...props}>
            <TextInput onEndEditing={onEndEditing} placeholder={placeholder}
                style={[{ height: 50, backgroundColor: color.text, color: color.backgroundColor, paddingLeft: 10, fontSize: 16, borderRadius: 5 }, inputStyle]}
                {...inputProps} />
            <FlatList data={all} style={{ flex: 1, flexGrow: 1 }}
                keyExtractor={({ id, isLocal }) => `${id}-${isLocal}`}
                renderItem={renderItem} />
            {isLoading && <Loading style={{ backgroundColor: "transparent" }} />}
            {(!!actions || !!prompts) && (
                <View style={{ height: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-around" }}>
                    {actions}
                    {prompts?.map(a => <PromptAction prompt={a} key={a.label} />)}
                </View>
            )}
        </View>
    );
}
