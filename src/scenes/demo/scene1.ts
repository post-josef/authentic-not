import type { AbstractMesh } from "@babylonjs/core";
import { animationManager } from "../../managers/animation";
import { lightManager } from "../../managers/light";
import { objectManager } from "../../managers/object";
import type { Scene, Object3D, SceneObject } from "../../types";
import "./scene1.css";

const OBJECTS: Object3D[] = [
    {
        highlight: "outline",
        source: "assets/images/i1.png",
        x: -6,
        y: 1.8,
        z: 5,
        ry: -0.6,
        subtitle: "Row One",
        modalClassName: "modal-scene1",
        modal: [
            { type: "text", content: "Row One", tag: "h2" },
            { type: "image", src: "assets/images/i1.png", alt: "Row One" },
            { type: "embed", source: "https://www.youtube.com/watch?v=mMD63t-W0Os" },
            {
                type: "text",
                content: "The line begins here — a soft red light spills across the first frame.",
            },
            { type: "buttons", buttons: [{ label: "Close", action: "close" }] },
        ],
    },
    {
        highlight: "outline",
        source: "assets/images/i2.png",
        x: -3,
        y: 1.8,
        z: 5,
        ry: -0.2,
        subtitle: "Row Two",
        modalClassName: "modal-scene1",
        modal: [
            { type: "text", content: "Row Two", tag: "h2" },
            { type: "image", src: "assets/images/i2.png", alt: "Row Two" },
            { type: "embed", source: "https://www.youtube.com/watch?v=mMD63t-W0Os" },
            {
                type: "text",
                content: "Each panel leans in slightly, drawing you further along the corridor.",
            },
            { type: "buttons", buttons: [{ label: "Close", action: "close" }] },
        ],
    },
    {
        highlight: "outline",
        source: "assets/images/i3.png",
        x: 0,
        y: 1.8,
        z: 5,
        ry: 0,
        subtitle: "Row Three",
        modalClassName: "modal-scene1",
        modal: [
            { type: "text", content: "Row Three", tag: "h2" },
            { type: "image", src: "assets/images/i3.png", alt: "Row Three" },
            { type: "embed", source: "https://vimeo.com/384166760" },
            {
                type: "text",
                content: "At the center, the spot finds its mark and the image gently breathes.",
            },
            { type: "buttons", buttons: [{ label: "Close", action: "close" }] },
        ],
    },
    {
        highlight: "outline",
        source: "assets/images/i4.png",
        x: 3,
        y: 1.8,
        z: 5,
        ry: 0.2,
        subtitle: "Row Four",
        modalClassName: "modal-scene1",
        modal: [
            { type: "text", content: "Row Four", tag: "h2" },
            { type: "image", src: "assets/images/i4.png", alt: "Row Four" },
            { type: "embed", source: "https://www.youtube.com/watch?v=mMD63t-W0Os" },
            {
                type: "text",
                content: "The rhythm holds — quiet float, warm glow, one piece after another.",
            },
            { type: "buttons", buttons: [{ label: "Close", action: "close" }] },
        ],
    },
    {
        highlight: "outline",
        source: "assets/images/i5.png",
        x: 6,
        y: 1.8,
        z: 5,
        ry: 0.6,
        subtitle: "Row Five",
        modalClassName: "modal-scene1",
        modal: [
            { type: "text", content: "Row Five", tag: "h2" },
            { type: "image", src: "assets/images/i5.png", alt: "Row Five" },
            { type: "embed", source: "https://www.youtube.com/watch?v=mMD63t-W0Os" },
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
    private objects: SceneObject[] = [];

    async load(): Promise<void> {
        this.objects = await Promise.all(
            OBJECTS.map(async (object, index) => {
                const instance = await objectManager.create(object);
                animationManager.add(instance.mesh, {
                    preset: "float",
                    speed: 1.4,
                    phase: index,
                });
                return instance;
            }),
        );

        lightManager.createSpot("scene1Spot", [0, 3.2, 1.5], {
            target: [0, 1.8, 5],
            diffuse: [1, 0.32, 0.32],
            specular: [1, 0.35, 0.35],
            intensity: 1.2,
            range: 14,
            includedOnlyMeshes: this.getMeshes(),
            fixture: { scale: 0.55, color: [1, 0.32, 0.32] },
        });
    }

    unload() {
        this.objects.forEach((object) => object.dispose());
        this.objects = [];
    }

    getMeshes(): AbstractMesh[] {
        return this.objects.flatMap((object) => objectManager.meshes(object));
    }
}
