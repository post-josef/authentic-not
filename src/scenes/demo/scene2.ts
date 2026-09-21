import type { AbstractMesh } from "@babylonjs/core";
import { animationManager } from "../../managers/animation";
import { audioManager } from "../../managers/audio";
import { fogManager } from "../../managers/fog";
import { objectManager } from "../../managers/object";
import { subtitleManager } from "../../managers/subtitle";
import type { Scene, Object3D, SceneObject } from "../../types";
import "./scene2.css";

const KICK_SOUND = "scene2-kick";
const COWBELL_SOUND = "scene2-cowbell";
const MICROWAVE_SOUND = "scene2-microwave";
const OBJECTS: Object3D[] = [
    {
        id: "1",
        highlight: "highlightLayer",
        subtitle: "Drift One",
        source: "assets/images/i2.png",
        x: -4.5,
        y: 2.4,
        z: 3,
        ry: 0.35,
        modalClassName: "modal-scene2",
        modal: [
            { type: "text", content: "Drift One", tag: "h2" },
            { type: "image", src: "assets/images/i2.png", alt: "Drift One" },
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
        id: "2",
        highlight: "highlightLayer",
        subtitle: "Drift Two",
        source: "assets/images/i4.png",
        x: -1.8,
        y: 1.2,
        z: 6,
        ry: -0.15,
        modalClassName: "modal-scene2",
        modal: [
            { type: "text", content: "Drift Two", tag: "h2" },
            { type: "image", src: "assets/images/i4.png", alt: "Drift Two" },
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
        id: "3",
        highlight: "highlightLayer",
        subtitle: "Drift Three",
        source: "assets/images/i1.png",
        x: 0,
        y: 2.8,
        z: 4.5,
        ry: 0,
        modalClassName: "modal-scene2",
        modal: [
            { type: "text", content: "Drift Three", tag: "h2" },
            { type: "image", src: "assets/images/i1.png", alt: "Drift Three" },
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
        id: "4",
        highlight: "highlightLayer",
        subtitle: "Drift Four",
        source: "assets/images/i5.png",
        x: 2.2,
        y: 1.5,
        z: 5.5,
        ry: 0.2,
        modalClassName: "modal-scene2",
        modal: [
            { type: "text", content: "Drift Four", tag: "h2" },
            { type: "image", src: "assets/images/i5.png", alt: "Drift Four" },
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
        id: "5",
        highlight: "highlightLayer",
        subtitle: "Drift Five",
        source: "assets/images/i3.png",
        x: 4.8,
        y: 2.1,
        z: 3.5,
        ry: -0.4,
        modalClassName: "modal-scene2",
        modal: [
            { type: "text", content: "Drift Five", tag: "h2" },
            { type: "image", src: "assets/images/i3.png", alt: "Drift Five" },
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
    private objects: SceneObject[] = [];

    async load(): Promise<void> {
        // audio assets are not provided, it will throw error
        audioManager.load(KICK_SOUND, "assets/audio/kick.wav", { volume: 0.55 });
        audioManager.load(COWBELL_SOUND, "assets/audio/cowbell.wav", { volume: 0.45 });
        audioManager.load(MICROWAVE_SOUND, "assets/audio/microwave.wav", {
            volume: 0.55,
            persist: true,
        });

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

        this.objects = await Promise.all(
            OBJECTS.map(async (object, index) => {
                const instance = await objectManager.create(object);
                objectManager.interactive(instance, {
                    onClick: () => {
                        audioManager.play(index % 2 === 0 ? KICK_SOUND : COWBELL_SOUND);
                        objectManager.openModal(object, {
                            onSceneSwitch: (sceneId) => {
                                if (sceneId === "scene3") audioManager.play(MICROWAVE_SOUND);
                            },
                        });
                    },
                    onHover: () => object.subtitle && subtitleManager.show(object.subtitle),
                    onHoverEnd: () => subtitleManager.hide(),
                });
                animationManager.addMany(`scene2-${index}`, instance.mesh, [
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

    unload(): void {
        this.objects.forEach((object) => object.dispose());
        this.objects = [];
    }

    getMeshes(): AbstractMesh[] {
        return this.objects.map((object) => object.mesh);
    }
}
