import { Color3, Vector3 } from "@babylonjs/core";
import { animationManager } from "../../managers/animation";
import { lightManager } from "../../managers/light";
import { objectManager } from "../../managers/object";
import type { Scene, Object3D } from "../../types";
import "./scene1.css";

const OBJECTS: Object3D[] = [
    {
        highlight: "outline",
        source: "assets/demo/c1.svg",
        x: -6,
        y: 1.8,
        z: 5,
        ry: -0.6,
        subtitle: "Row One",
        modalClassName: "modal-scene1",
        modal: [
            { type: "text", content: "Row One", tag: "h2" },
            { type: "image", src: "assets/demo/c1.svg", alt: "Row One" },
            {
                type: "text",
                content: "The line begins here — a soft red light spills across the first frame.",
            },
            { type: "buttons", buttons: [{ label: "Close", action: "close" }] },
        ],
    },
    {
        highlight: "outline",
        source: "assets/demo/c2.svg",
        x: -3,
        y: 1.8,
        z: 5,
        ry: -0.2,
        subtitle: "Row Two",
        modalClassName: "modal-scene1",
        modal: [
            { type: "text", content: "Row Two", tag: "h2" },
            { type: "image", src: "assets/demo/c2.svg", alt: "Row Two" },
            {
                type: "text",
                content: "Each panel leans in slightly, drawing you further along the corridor.",
            },
            { type: "buttons", buttons: [{ label: "Close", action: "close" }] },
        ],
    },
    {
        highlight: "outline",
        source: "assets/demo/c3.svg",
        x: 0,
        y: 1.8,
        z: 5,
        ry: 0,
        subtitle: "Row Three",
        modalClassName: "modal-scene1",
        modal: [
            { type: "text", content: "Row Three", tag: "h2" },
            { type: "image", src: "assets/demo/c3.svg", alt: "Row Three" },
            // { type: "embed", source: "https://vimeo.com/<video-id-here>" },
            {
                type: "text",
                content: "At the center, the spot finds its mark and the image gently breathes.",
            },
            { type: "buttons", buttons: [{ label: "Close", action: "close" }] },
        ],
    },
    {
        highlight: "outline",
        source: "assets/demo/c4.svg",
        x: 3,
        y: 1.8,
        z: 5,
        ry: 0.2,
        subtitle: "Row Four",
        modalClassName: "modal-scene1",
        modal: [
            { type: "text", content: "Row Four", tag: "h2" },
            { type: "image", src: "assets/demo/c4.svg", alt: "Row Four" },
            // { type: "embed", source: "https://www.youtube.com/watch?v=<video-id-here>" },
            {
                type: "text",
                content: "The rhythm holds — quiet float, warm glow, one piece after another.",
            },
            { type: "buttons", buttons: [{ label: "Close", action: "close" }] },
        ],
    },
    {
        highlight: "outline",
        source: "assets/demo/c5.svg",
        x: 6,
        y: 1.8,
        z: 5,
        ry: 0.6,
        subtitle: "Row Five",
        modalClassName: "modal-scene1",
        modal: [
            { type: "text", content: "Row Five", tag: "h2" },
            { type: "image", src: "assets/demo/c5.svg", alt: "Row Five" },
            {
                type: "text",
                content: "The row ends, but the gallery does not. Step into the drifting collection ahead.",
            },
            {
                type: "buttons",
                buttons: [
                    { label: "Close", action: "close" },
                    { label: "Next", action: { scene: "scene2" } },
                ],
            },
        ],
    },
];

export class Scene1 implements Scene {
    async load(): Promise<void> {
        const panels = await Promise.all(
            OBJECTS.map(async (object, index) => {
                const instance = await objectManager.create(object);
                animationManager.add(instance, {
                    preset: "float",
                    speed: 1.4,
                    phase: index,
                });
                return instance;
            }),
        );

        lightManager.createLight({
            x: 0,
            y: 6,
            z: 1.5,
            target: new Vector3(0, 1.8, 5), // center
            color: new Color3(1, 0.28, 0.32), // red
            intensity: 20,
            meshes: panels,
            fixture: { scale: 0.5 },
        });
        lightManager.createLight({
            x: 6,
            y: 6,
            z: 1.5,
            target: new Vector3(6, 1.6, 5), // right
            color: new Color3(0.32, 1, 0.4), // green
            intensity: 40,
            meshes: panels,
            fixture: { scale: 0.5 },
        });
        lightManager.createLight({
            x: -6,
            y: 6,
            z: 1.5,
            target: new Vector3(-5.8, 1.6, 5), // left
            color: new Color3(0.32, 0.2, 1), // blue
            intensity: 48,
            meshes: panels,
            fixture: { scale: 0.5 },
        });
    }
}
