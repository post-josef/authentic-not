import type { AbstractMesh } from "@babylonjs/core";
import { animationManager } from "../../managers/animation";
import { backgroundManager } from "../../managers/background";
import { lightManager } from "../../managers/light";
import { objectManager } from "../../managers/object";
import type { Scene, Object3D, SceneObject } from "../../types";
import "./scene4.css";

const LOOP_WIDTH = 4.2;
const LOOP_CENTER_Z = 5.5;
const LOOP_SPEED = 0.14;
const PANEL_COUNT = 5;
const ENVIRONMENT_URL = "https://assets.babylonjs.com/environments/environmentSpecular.env";
const OBJECTS: Object3D[] = [
    {
        id: "1",
        highlight: "glow",
        subtitle: "Loop One",
        source: "assets/images/i3.png",
        x: 0,
        y: 2.2,
        z: LOOP_CENTER_Z,
        ry: 0,
        modalClassName: "modal-scene4",
        modal: [
            { type: "text", content: "Loop One", tag: "h2" },
            { type: "image", src: "assets/images/i3.png", alt: "Loop One" },
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
        id: "2",
        highlight: "glow",
        subtitle: "Loop Two",
        source: "assets/images/i2.png",
        x: 0,
        y: 2.2,
        z: LOOP_CENTER_Z,
        ry: 0,
        modalClassName: "modal-scene4",
        modal: [
            { type: "text", content: "Loop Two", tag: "h2" },
            { type: "image", src: "assets/images/i2.png", alt: "Loop Two" },
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
        id: "3",
        highlight: "glow",
        subtitle: "Loop Three",
        source: "assets/images/i5.png",
        x: 0,
        y: 2.2,
        z: LOOP_CENTER_Z,
        ry: 0,
        modalClassName: "modal-scene4",
        modal: [
            { type: "text", content: "Loop Three", tag: "h2" },
            { type: "image", src: "assets/images/i5.png", alt: "Loop Three" },
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
        id: "4",
        highlight: "glow",
        subtitle: "Loop Four",
        source: "assets/images/i1.png",
        x: 0,
        y: 2.2,
        z: LOOP_CENTER_Z,
        ry: 0,
        modalClassName: "modal-scene4",
        modal: [
            { type: "text", content: "Loop Four", tag: "h2" },
            { type: "image", src: "assets/images/i1.png", alt: "Loop Four" },
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
        id: "5",
        highlight: "glow",
        subtitle: "Loop Five",
        source: "assets/images/i4.png",
        x: 0,
        y: 2.2,
        z: LOOP_CENTER_Z,
        ry: 0,
        modalClassName: "modal-scene4",
        modal: [
            { type: "text", content: "Loop Five", tag: "h2" },
            { type: "image", src: "assets/images/i4.png", alt: "Loop Five" },
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
    private objects: SceneObject[] = [];

    async load(): Promise<void> {
        backgroundManager.setEnvironment(ENVIRONMENT_URL, {
            intensity: 0.7,
            rotation: Math.PI * 0.15,
            size: 500,
            blur: 0.15,
        });

        this.objects = await Promise.all(
            OBJECTS.map(async (object, index) => {
                const instance = await objectManager.create(object);
                animationManager.add(`scene4-${index}`, instance.mesh, {
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

        lightManager.createPoint("scene4Ember", [0, 2.8, LOOP_CENTER_Z], {
            diffuse: [1, 0.55, 0.25],
            specular: [1, 0.45, 0.2],
            intensity: 1.3,
            range: 18,
            fixture: { scale: 0.35, color: [1, 0.55, 0.25] },
        });
    }

    unload(): void {
        this.objects.forEach((object) => object.dispose());
        this.objects = [];
    }

    getMeshes(): AbstractMesh[] {
        return this.objects.map((object) => object.mesh);
    }
}
