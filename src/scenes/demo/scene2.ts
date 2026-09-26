import { animationManager } from "../../managers/animation";
import { audioManager } from "../../managers/audio";
import { fogManager } from "../../managers/fog";
import { objectManager } from "../../managers/object";
import { subtitleManager } from "../../managers/subtitle";
import type { Scene, Object3D } from "../../types";
import "./scene2.css";

const SOUND_1 = "assets/demo/a1-stick-click.wav";
const SOUND_2 = "assets/demo/a2-foam-hit.wav";
const SOUND_3 = "assets/demo/a3-glass-click.wav";
const SOUND_4 = "assets/demo/a4-stick-on-paper.wav";
const SOUND_5 = "assets/demo/a5-stoneware-click.wav";

const OBJECTS: Object3D[] = [
    {
        highlight: "highlightLayer",
        subtitle: "Drift One",
        source: "assets/demo/i2.png",
        x: -4.5,
        y: 2.4,
        z: 3,
        ry: 0.35,
        modalClassName: "modal-scene2",
        modal: [
            { type: "text", content: "Drift One", tag: "h2" },
            { type: "image", src: "assets/demo/i2.png", alt: "Drift One" },
            {
                type: "text",
                content: "Orbiting gallery — each panel drifts on its own path.",
            },
            {
                type: "buttons",
                buttons: [{ label: "Close", action: "close" }],
            },
        ],
    },
    {
        highlight: "highlightLayer",
        subtitle: "Drift Two",
        source: "assets/demo/i4.png",
        x: -1.8,
        y: 1.2,
        z: 6,
        ry: -0.15,
        modalClassName: "modal-scene2",
        modal: [
            { type: "text", content: "Drift Two", tag: "h2" },
            { type: "image", src: "assets/demo/i4.png", alt: "Drift Two" },
            {
                type: "text",
                content: "Depth layers create a staggered, cinematic feel.",
            },
            {
                type: "buttons",
                buttons: [{ label: "Close", action: "close" }],
            },
        ],
    },
    {
        highlight: "highlightLayer",
        subtitle: "Drift Three",
        source: "assets/demo/i1.png",
        x: 0,
        y: 2.8,
        z: 4.5,
        ry: 0,
        modalClassName: "modal-scene2",
        modal: [
            { type: "text", content: "Drift Three", tag: "h2" },
            { type: "image", src: "assets/demo/i1.png", alt: "Drift Three" },
            {
                type: "text",
                content: "Center piece rises and falls with a slow pulse.",
            },
            {
                type: "buttons",
                buttons: [{ label: "Close", action: "close" }],
            },
        ],
    },
    {
        highlight: "highlightLayer",
        subtitle: "Drift Four",
        source: "assets/demo/i5.png",
        x: 2.2,
        y: 1.5,
        z: 5.5,
        ry: 0.2,
        modalClassName: "modal-scene2",
        modal: [
            { type: "text", content: "Drift Four", tag: "h2" },
            { type: "image", src: "assets/demo/i5.png", alt: "Drift Four" },
            {
                type: "text",
                content: "Gentle yaw oscillation adds life without distraction.",
            },
            {
                type: "buttons",
                buttons: [{ label: "Close", action: "close" }],
            },
        ],
    },
    {
        highlight: "highlightLayer",
        subtitle: "Drift Five",
        source: "assets/demo/i3.png",
        x: 4.8,
        y: 2.1,
        z: 3.5,
        ry: -0.4,
        modalClassName: "modal-scene2",
        modal: [
            { type: "text", content: "Drift Five", tag: "h2" },
            { type: "image", src: "assets/demo/i3.png", alt: "Drift Five" },
            {
                type: "text",
                content: "Continue to the orbital ring gallery.",
            },
            {
                type: "buttons",
                buttons: [
                    { label: "Close", action: "close" },
                    { label: "Next", action: { scene: "scene3" } },
                ],
            },
        ],
    },
];

export class Scene2 implements Scene {
    async load(): Promise<void> {
        const SOUNDS = [SOUND_1, SOUND_2, SOUND_3, SOUND_4, SOUND_5];
        SOUNDS.forEach((sound) => audioManager.load(sound, { volume: 0.6 }));

        fogManager.set({
            mode: "exp2",
            color: [0.16, 0.19, 0.26],
            density: 0.022,
        });
        fogManager.setMist({
            color: [0.58, 0.65, 0.78],
            opacity: 0.05,
            count: 260,
            size: [7, 16],
            center: [0, 2.2, 4.5],
            extents: [16, 4.5, 14],
            speed: 0.3,
            followCamera: true,
        });

        await Promise.all(
            OBJECTS.map(async (object, index) => {
                const instance = await objectManager.create(object);
                objectManager.interactive(instance, {
                    onClick: () => {
                        audioManager.play(SOUNDS[index]);
                        objectManager.openModal(object, {
                            onSceneSwitch: () => {
                                audioManager.play(SOUND_5, { persist: true });
                            },
                        });
                    },
                    onHover: () => object.subtitle && subtitleManager.show(object.subtitle),
                    onHoverEnd: () => subtitleManager.hide(),
                });
                animationManager.add(instance, [
                    {
                        preset: "drift",
                        amplitude: [0.25, 0.35, 0.2],
                        speed: [0.7, 1.1, 0.5],
                        yawAmplitude: 0.12,
                        yawSpeed: 0.9,
                        phase: index * 1.2,
                    },
                    {
                        preset: "pulse",
                        min: 0.97,
                        max: 1.03,
                        speed: 2,
                        phase: index * 1.2,
                    },
                ]);
                return instance;
            }),
        );
    }
}
