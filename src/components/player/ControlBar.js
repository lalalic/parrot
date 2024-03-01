import React from 'react';
import SliderIcon from "../SliderIcon";
import ControlIcons from "../ControlIcons";
import PressableIcon from './GrayPressableIcon';

export default function ControlBar({controls, policy, changePolicy, dispatch}) {
    return (
        <>
            {false != controls.record && <PressableIcon style={{ marginRight: 10 }} testID="record"
                //label={l10n["Record"]} labelFade={true}
                name={`${ControlIcons.record}${!policy.record ? "-off" : ""}`}
                onPress={e => changePolicy("record", !policy.record)} />}

            {false != controls.video && <PressableIcon style={{ marginRight: 10 }} testID="video"
                //label={l10n["Video"]} labelFade={true}
                name={`${ControlIcons.visible}${!policy.visible ? "-off" : ""}`}
                onPress={e => changePolicy("visible", !policy.visible)} />}

            {false != controls.caption && <SliderIcon style={{ marginRight: 10 }} testID="caption"
                //label={l10n["Caption"]} labelFade={true}
                icon={`${ControlIcons.caption}${!policy.caption ? "-disabled" : ""}`}
                onToggle={() => changePolicy("caption", !policy.caption)}
                onSlideFinish={delay => changePolicy("captionDelay", delay)}
                slider={{ minimumValue: 0, maximumValue: 3, step: 1, value: policy.captionDelay, text: t => `${-t}s` }} />}

            {false != controls.autoChallenge && <SliderIcon style={{ marginRight: 10 }} testID="autoChallenge"
                //label={l10n["Auto"]} labelFade={true}
                icon={policy.autoChallenge > 0 ? ControlIcons.autoChallenge : "filter-alt-off"}
                onToggle={e => changePolicy("autoChallenge", policy.autoChallenge ? 0 : 80)}
                onSlideFinish={value => changePolicy("autoChallenge", value)}
                slider={{ minimumValue: 0, maximumValue: 100, step: 5, value: policy.autoChallenge ?? 0 }} />}

            {false != controls.speed && <SliderIcon style={{ marginRight: 10 }} testID="speed"
                icon={ControlIcons.speed}
                //label={l10n["Speed"]} labelFade={true}
                onToggle={() => dispatch({ type: "speed/toggle" })}
                onSlideFinish={rate => dispatch({ type: "speed/tune", rate })}
                slider={{ minimumValue: 0.5, maximumValue: 1.5, step: 0.25, value: policy.speed, text: t => `${t}x` }} />}

            {false != controls.whitespace && <SliderIcon style={{ marginRight: 10 }} testID="whitespace"
                //label={l10n["Whitespace"]} labelFade={true}
                icon={policy.whitespace > 0 ? ControlIcons.whitespace : "mic-external-off"}
                onToggle={() => changePolicy("whitespace", policy.whitespace > 0 ? 0 : 1)}
                onSlideFinish={value => changePolicy("whitespace", value)}
                slider={{ minimumValue: 0.5, maximumValue: 4, step: 0.5, value: policy.whitespace, text: t => `${t}x` }} />}

            {false != controls.chunk && <SliderIcon style={{ marginRight: 10 }} testID="chunk"
                //label={l10n["Chunk"]} labelFade={true}
                icon={policy.chunk > 0 ? ControlIcons.chunk : "not-interested"}
                onToggle={() => changePolicy("chunk", policy.chunk > 0 ? 0 : 1)}
                onSlideFinish={value => changePolicy("chunk", value)}
                slider={{ minimumValue: 0, maximumValue: 10, step: 1, value: policy.chunk, text: t => ({ '9': "paragraph", "10": "whole" })[t + ''] || `${t} chunks` }} />}

            {false != controls.fullscreen && <PressableIcon style={{ marginRight: 10 }} testID="fullscreen"
                name={!policy.fullscreen ? ControlIcons.fullscreen : "fullscreen-exit"}
                onPress={e => {
                    changePolicy("fullscreen", !policy.fullscreen);
                }} />}
        </>
    );
}
