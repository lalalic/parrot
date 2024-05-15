import React from 'react';
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { ColorScheme } from 'react-native-use-qili/components/default-style';
import PressableIcon from "react-native-use-qili/components/PressableIcon";
import FlyMessage from "react-native-use-qili/components/FlyMessage";
import lock from "./lock";


const PlaySound = Object.assign(({ audio, children = null, onEnd, onStart, onError }) => {
    React.useEffect(() => {
        if (audio) {
            (async (startAt) => {
                onStart?.();
                await PlaySound.play(audio, () => onEnd?.(Date.now() - startAt), onError);
            })(Date.now());

            return () => PlaySound.stop?.();
        }
    }, [audio]);
    return children;
}, {
    Trigger({ name = "mic", audio, play=false, onEnd }) {
        const color = React.useContext(ColorScheme);
        const [playing, setPlaying] = React.useState(play);
        return (
            <>
                <PressableIcon name={name}
                    onPress={e => setPlaying(true)}
                    color={playing ? color.primary : undefined} />
                {playing && <PlaySound audio={audio} onEnd={()=>{setPlaying(false); onEnd?.()}} />}
            </>
        );
    },
    displayName: "PlaySound",
    async play(audio, done, onError) {
        await lock.runExclusive(async () => {
            let sound, check;
            try {
                const audioFile = await FileSystem.getInfoAsync(audio);
                if (!audioFile.exists) {
                    return;
                }

                await new Promise(($resolve, reject) => {
                    const resolve = e => {
                        clearInterval(check);
                        $resolve();
                    };

                    this.stop = () => {
                        resolve();
                        sound?.unloadAsync();
                        done?.();
                    };

                    Audio.Sound.createAsync(
                        { uri: audio },
                        { shouldPlay: true },
                        status => {
                            const { error, didJustFinish } = status;
                            error && console.error(error);
                            if (error || didJustFinish) {
                                resolve();
                            }
                        }
                    ).then(a => {
                        sound = a.sound;
                        //a hack for bug 
                        check = setInterval(async () => {
                            const status = await sound.getStatusAsync();
                            if (status.didJustFinish || (status.isLoaded && !status.isPlaying)) {
                                resolve();
                            }
                        }, 300);
                    }).catch(e => {
                        reject(e);
                    });
                });
            } catch (e) {
                FlyMessage.show(e.message);
                onError?.(e);
            } finally {
                sound?.unloadAsync();
                done?.();
            }
        });
    }
});

export default PlaySound;

