import type { AbstractMesh } from "@babylonjs/core";
import { animationManager } from "../../managers/animation";
import { lightManager } from "../../managers/light";
import { objectManager } from "../../managers/object";
import type { Scene, Object3D, SceneObject } from "../../types";
import "./scene3.css";

const RING_RADIUS = 5.5;
const RING_CENTER: [number, number, number] = [0, 2.2, 8];
const PANEL_COUNT = 5;
const OBJECTS: Object3D[] = [
    {
        id: "1",
        highlight: "outline",
        subtitle: "Orbit One",
        source: "assets/images/i3.png",
        x: 0,
        y: 2.2,
        z: 8 + RING_RADIUS,
        ry: 0,
        modalClassName: "modal-scene3",
        modal: [
            { type: "text", content: "Orbit One", tag: "h2" },
            { type: "image", src: "assets/images/i3.png", alt: "Orbit One" },
            {
                type: "text",
                content: "Panels ride a slow ring — the whole constellation turns together.",
            },
            {
                type: "buttons",
                buttons: [{ label: "Close", action: "close" }],
            },
        ],
    },
    {
        id: "2",
        highlight: "outline",
        subtitle: "Orbit Two",
        source: "assets/images/i5.png",
        x: 0,
        y: 2.5,
        z: 8,
        ry: 0,
        modalClassName: "modal-scene3",
        modal: [
            { type: "text", content: "Orbit Two", tag: "h2" },
            { type: "image", src: "assets/images/i5.png", alt: "Orbit Two" },
            {
                type: "text",
                content: "Each frame faces the hub while the carousel drifts through space.",
            },
            {
                type: "buttons",
                buttons: [{ label: "Close", action: "close" }],
            },
        ],
    },
    {
        id: "3",
        highlight: "outline",
        subtitle: "Orbit Three",
        source: "assets/images/i1.png",
        x: 0,
        y: 1.9,
        z: 8,
        ry: 0,
        modalClassName: "modal-scene3",
        modal: [
            { type: "text", content: "Orbit Three", tag: "h2" },
            { type: "image", src: "assets/images/i1.png", alt: "Orbit Three" },
            {
                type: "text",
                content: "A cool hub light catches the edges as panels pass in front of one another.",
            },
            {
                type: "buttons",
                buttons: [{ label: "Close", action: "close" }],
            },
        ],
    },
    {
        id: "4",
        highlight: "outline",
        subtitle: "Orbit Four",
        source: "assets/images/i4.png",
        x: 0,
        y: 2.4,
        z: 8,
        ry: 0,
        modalClassName: "modal-scene3",
        modal: [
            { type: "text", content: "Orbit Four", tag: "h2" },
            { type: "image", src: "assets/images/i4.png", alt: "Orbit Four" },
            {
                type: "text",
                content: "Gentle tilt wobble keeps the ring from feeling mechanical.",
            },
            {
                type: "buttons",
                buttons: [{ label: "Close", action: "close" }],
            },
        ],
    },
    {
        id: "5",
        highlight: "outline",
        subtitle: "Orbit Five",
        source: "assets/images/i2.png",
        x: 0,
        y: 2.1,
        z: 8,
        ry: 0,
        modalClassName: "modal-scene3",
        modal: [
            { type: "text", content: "Orbit Five", tag: "h2" },
            { type: "image", src: "assets/images/i2.png", alt: "Orbit Five" },
            {
                type: "text",
                content: "Follow the figure-eight — a warmer loop lies ahead.",
            },
            {
                type: "buttons",
                buttons: [
                    { label: "Close", action: "close" },
                    { label: "Next", action: { scene: "scene4" } },
                ],
            },
        ],
    },
];

export class Scene3 implements Scene {
    private objects: SceneObject[] = [];

    async load(): Promise<void> {
        this.objects = await Promise.all(
            OBJECTS.map(async (object, index) => {
                const baseAngle = (index / PANEL_COUNT) * Math.PI * 2 - Math.PI / 2;
                const instance = await objectManager.create(object);
                animationManager.add(`scene3-${index}`, instance.mesh, {
                    preset: "orbit",
                    center: RING_CENTER,
                    radius: RING_RADIUS,
                    speed: 0.18,
                    startAngle: baseAngle,
                    heightOffset: (index - 2) * 0.28,
                    floatAmplitude: 0.18,
                    floatSpeed: 1.3,
                    floatPhase: index * 0.9,
                    faceCamera: true,
                    cameraSpotAngle: -Math.PI / 2,
                    cameraSpotWidth: 0.55,
                    tiltPhaseX: index * 0.7,
                    tiltPhaseZ: index * 0.5,
                });
                return instance;
            }),
        );

        lightManager.createPoint("scene3Hub", RING_CENTER, {
            diffuse: [0.45, 0.65, 1],
            specular: [0.5, 0.7, 1],
            intensity: 0.85,
            range: 20,
            fixture: { scale: 0.35, color: [0.45, 0.65, 1] },
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
