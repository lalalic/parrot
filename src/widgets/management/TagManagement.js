import React from 'react';
import { View, Text, TextInput, FlatList, Pressable } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from 'react-router-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { selectWidgetTalks, TalkApi, Qili as QiliApi } from "../../store";
import { isAdmin } from "react-native-use-qili/store"
import PromptAction from './PromptAction';
import PressableIcon from "react-native-use-qili/components/PressableIcon";
import ChangableText from "react-native-use-qili/components/ChangableText";
import Loading from "react-native-use-qili/components/Loading";
import { ColorScheme } from 'react-native-use-qili/components/default-style';
const l10n=globalThis.l10n

function create({slug, id=`${slug}${Date.now()}`, ...talk}, dispatch){
    console.assert(slug, "Slug must be specified when creating widget talk")
    dispatch({type:"talk/set",talk:{data:[],...talk,id,slug}})
    return id
}

export default function TagManagement({ talk, placeholder, onCreate, slug = talk.slug, dispatch = useDispatch(), ...props }){
    const talks = useSelector(state => selectWidgetTalks(state, slug));
    const [searchParams, setSearchParams]=useSearchParams()
    const [isManageRemote, setManageRemote ]=React.useState(false)
    const [bAdmin, setIsAdmin ]=React.useState(false)
    React.useEffect(()=>{
        isAdmin().then(b=>setIsAdmin(b),()=>setIsAdmin(false))
    },[])

    React.useEffect(()=>{
        setManageRemote(bAdmin && searchParams.get('remote')==="true")
    },[searchParams, bAdmin])

    const manageAction=React.useMemo(()=>{
        if(bAdmin){
            return <PressableIcon 
                    name="admin-panel-settings"
                    color={isManageRemote ? "yellow" : undefined}
                    onPress={()=>setSearchParams({remote:!isManageRemote})}
                    />
        }
        return null
    },[isManageRemote, bAdmin, setSearchParams])

    return (
        <TagList slug={slug} manageAction={manageAction}
            data={isManageRemote ? [] :talks} 
            isManageRemote={isManageRemote}
            placeholder={l10n[placeholder || `Create new ${talk.title}`]}
            onEndEditing={({ nativeEvent: { text: title } }) => {
                title = title.trim();
                if (!title || -1 !== talks.findIndex(a => a.title == title)) {
                    return;
                }

                if (onCreate) {
                    onCreate({ title, slug }, dispatch);
                } else {
                    create({ title, slug, data: [] }, dispatch);
                }
            }}
            renderItemText={item => item.title}
            {...props} />
    );
}

TagManagement.create=create

function TagList({ data, isManageRemote,manageAction, slug, onEndEditing, style, placeholder, children, iconWidth = 50, 
    navigate = useNavigate(), 
    dispatch = useDispatch(), 
    actions, prompts, 
    renderItemExtra = ({ item }) => {
        if (item.isLocal !== true) {
            if(isManageRemote){
                return (
                    <PressableIcon name="remove-circle-outline"
                        onPress={e => {
                            dispatch(QiliApi.endpoints.remove.initiate({id: item.id, slug, type:"Widget"}))
                        }}
                        style={{ width: iconWidth }} />
                )
            }
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
    }, 
    renderItemText = a => a.id, 
    renderItem= function({ item, id = item.id }){
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

                    {isManageRemote ? 
                        (<ChangableText style={[containerStyle, { flexGrow: 1 }]}
                            text={{ style: textStyle, value: text }}
                            onChange={title =>{
                                dispatch(QiliApi.endpoints.changeTitle({id, title}))
                            }} />)
                        : 
                        (<Text style={[{ flexGrow: 1 }, textStyle]}>{text}</Text>)}

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
    }, 
    inputProps: { style: inputStyle, ...inputProps } = {}, 
    ...props 
}) {
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
            
            <View style={{ height: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-around" }}>
                {actions}
                {manageAction}
                {prompts?.map(a => <PromptAction prompt={a} key={a.label} />)}
            </View>
        </View>
    );
}