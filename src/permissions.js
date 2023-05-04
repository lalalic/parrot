import React from "react";
import * as ImagePicker from "expo-image-picker";
import { Audio } from 'expo-av';
import * as Calendar from 'expo-calendar';
import { useDispatch, useSelector } from "react-redux";
import TTS from "react-native-tts"

export const Permissions = () => {
    const dispatch=useDispatch()
    const [, requestCameraPermission] = ImagePicker.useCameraPermissions();
    const [, requestMediaLibPermission] = ImagePicker.useMediaLibraryPermissions();
    const [, requestRecordPermission] = Audio.usePermissions();
    const [, requestCalendarPermission] = Calendar.useCalendarPermissions()
    const [, requestReminderPermission] = Calendar.useRemindersPermissions()

    const calendarID=useSelector(state=>state.plan.calendar)
    const {tts={}}=useSelector(state=>state.my)
    if(tts.voice){
        TTS.setDefaultVoice(tts.voice)
    }

    React.useEffect(() => {
        if (requestCameraPermission) {
            requestCameraPermission();
        }
    }, [requestCameraPermission,]);

    React.useEffect(() => {
        if (requestMediaLibPermission) {
            requestMediaLibPermission();
        }
    }, [requestMediaLibPermission]);

    React.useEffect(() => {
        if (requestRecordPermission) {
            requestRecordPermission();
        }
    }, [requestRecordPermission]);

    React.useEffect(()=>{
        if(requestCalendarPermission){
            requestCalendarPermission()
        }
    },[requestCalendarPermission])

    React.useEffect(()=>{
        if(requestReminderPermission){
            requestReminderPermission()
        }
    },[requestReminderPermission])

    React.useEffect(()=>{
        if(!calendarID){
            (async()=>{
                const defaultCalendar =await Calendar.getDefaultCalendarAsync()
                const id=await Calendar.createCalendarAsync({
                    title:"Parrot Talk",
                    color:"blue",
                    entityType: Calendar.EntityTypes.EVENT,
                    sourceId: defaultCalendar.source.id,
                    source: defaultCalendar.source,
                    name: 'Parrot',
                    ownerAccount: 'personal',
                    accessLevel: Calendar.CalendarAccessLevel.OWNER
                })
                dispatch({type:"plan/calendar", id})
            })();
        }
    },[calendarID])

    return null;
};
