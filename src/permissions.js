import React from "react";
import * as ImagePicker from "expo-image-picker";
import { Audio } from 'expo-av';
import * as Calendar from 'expo-calendar';

export const Permissions = () => {
    const [, requestCameraPermission] = ImagePicker.useCameraPermissions();
    const [, requestMediaLibPermission] = ImagePicker.useMediaLibraryPermissions();
    const [, requestRecordPermission] = Audio.usePermissions();
    const [, requestCalendarPermission] = Calendar.useCalendarPermissions()
    const [, requestReminderPermission] = Calendar.useRemindersPermissions()

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

    return null;
};
