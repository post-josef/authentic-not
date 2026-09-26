import { Color3 } from "@babylonjs/core";
import { animationManager } from "../../managers/animation";
import { backgroundManager } from "../../managers/background";
import { lightManager } from "../../managers/light";
import { objectManager } from "../../managers/object";
import type { Scene, Object3D } from "../../types";
import "./scene4.css";

const LOOP_WIDTH = 4.2;
const LOOP_CENTER_Z = 5.5;
const LOOP_SPEED = 0.14;
const PANEL_COUNT = 5;
const ENVIRONMENT_URL = "https://assets.babylonjs.com/environments/environmentSpecular.env";
const OBJECTS: Object3D[] = [
    {
        highlight: "glow",
        subtitle: "Loop One",
        source: "assets/demo/i3.png",
        x: 0,
        y: 2.2,
        z: LOOP_CENTER_Z,
        ry: 0,
        modalClassName: "modal-scene4",
        modal: [
            { type: "text", content: "Loop One", tag: "h2" },
            { type: "image", src: "assets/demo/i3.png", alt: "Loop One" },
            {
                type: "text",
                content: "The path bends into a figure-eight — panels trace an endless crossing.",
            },
            {
                type: "buttons",
                buttons: [{ label: "Close", action: "close" }],
            },
        ],
    },
    {
        highlight: "glow",
        subtitle: "Loop Two",
        source: "assets/demo/i2.png",
        x: 0,
        y: 2.2,
        z: LOOP_CENTER_Z,
        ry: 0,
        modalClassName: "modal-scene4",
        modal: [
            { type: "text", content: "Loop Two", tag: "h2" },
            { type: "image", src: "assets/demo/i2.png", alt: "Loop Two" },
            {
                type: "text",
                content: "At the crossover, heights diverge — one rises as another dips below.",
            },
            {
                type: "buttons",
                buttons: [{ label: "Close", action: "close" }],
            },
        ],
    },
    {
        highlight: "glow",
        subtitle: "Loop Three",
        source: "assets/demo/i5.png",
        x: 0,
        y: 2.2,
        z: LOOP_CENTER_Z,
        ry: 0,
        modalClassName: "modal-scene4",
        modal: [
            { type: "text", content: "Loop Three", tag: "h2" },
            { type: "image", src: "assets/demo/i5.png", alt: "Loop Three" },
            {
                type: "text",
                content: "A warm ember light hangs at the knot, catching every passing frame.",
            },
            {
                type: "buttons",
                buttons: [{ label: "Close", action: "close" }],
            },
        ],
    },
    {
        highlight: "glow",
        subtitle: "Loop Four",
        source: "assets/demo/i1.png",
        x: 0,
        y: 2.2,
        z: LOOP_CENTER_Z,
        ry: 0,
        modalClassName: "modal-scene4",
        modal: [
            { type: "text", content: "Loop Four", tag: "h2" },
            { type: "image", src: "assets/demo/i1.png", alt: "Loop Four" },
            {
                type: "text",
                content: "Hover brings a soft bloom — the glow layer answers like a held breath.",
            },
            {
                type: "buttons",
                buttons: [{ label: "Close", action: "close" }],
            },
        ],
    },
    {
        highlight: "glow",
        subtitle: "Loop Five",
        source: "assets/demo/i4.png",
        x: 0,
        y: 2.2,
        z: LOOP_CENTER_Z,
        ry: 0,
        modalClassName: "modal-scene4",
        modal: [
            { type: "text", content: "Loop Five", tag: "h2" },
            { type: "image", src: "assets/demo/i4.png", alt: "Loop Five" },
            {
                type: "text",
                content: "The journey closes where it began. Return to the quiet row gallery.",
            },
            {
                type: "buttons",
                buttons: [
                    { label: "Close", action: "close" },
                    { label: "Next", action: { scene: "scene1" } },
                ],
            },
        ],
    },
];

export class Scene4 implements Scene {
    async load(): Promise<void> {
        backgroundManager.setEnvironment(ENVIRONMENT_URL, {
            intensity: 0.7,
            rotation: Math.PI * 0.15,
            size: 500,
            blur: 0.15,
        });

        await Promise.all(
            OBJECTS.map(async (object, index) => {
                const instance = await objectManager.create(object);
                animationManager.add(instance, {
                    preset: "figureEight",
                    center: [0, 2.2, LOOP_CENTER_Z],
                    width: LOOP_WIDTH,
                    height: 0.65,
                    speed: LOOP_SPEED,
                    phase: (index / PANEL_COUNT) * Math.PI * 2,
                    tiltPhase: index,
                });
                return instance;
            }),
        );

        lightManager.createLight({
            x: 0,
            y: 2.8,
            z: LOOP_CENTER_Z,
            color: new Color3(1, 0.55, 0.25),
            intensity: 1.3,
            range: 18,
            fixture: { scale: 0.35 },
        });
    }
}
