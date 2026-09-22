import { Color3, Vector3 } from "@babylonjs/core";
import { fogManager } from "../managers/fog";
import { lightManager } from "../managers/light";
import { modalManager } from "../managers/modal";
import { objectManager } from "../managers/object";
import type { Scene } from "../types";
import "./scene-ns.css";

export class SceneNs implements Scene {
    async load(): Promise<void> {
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

        for (const [index, x] of [
            [0, -4.2],
            [1, 0],
            [2, 4.2],
        ] as const) {
            await objectManager.create({
                source: "assets/ns/frame.png",
                x,
                y: 1.7,
                z: 6,
                width: 3.25,
                height: 2.7,
            });
            const panel = await objectManager.create({
                source: `assets/ns/${index + 1}.mp4`,
                x,
                y: 1.7,
                z: 5.999,
                width: 3.04,
                height: 2.2,
                highlight: "highlightLayer",
            });
            objectManager.interactive(panel, { onClick: () => this.openModal(index) });
        }

        const face = await objectManager.create({
            source: "assets/ns/face.glb",
            x: 0,
            y: -2.3,
            z: 16,
            scale: 5,
            ry: Math.PI,
        });

        lightManager.createLight({
            x: 0,
            y: 6,
            z: 12,
            target: new Vector3(0, 0, 16),
            color: new Color3(1, 0.8, 0.6),
            intensity: 12,
            range: 20,
            meshes: [face],
        });
    }

    private openModal(index: number) {
        modalManager.open({
            className: "modal-scene-ns",
            width: "min(92vw, 800px)",
            content: [
                { type: "button", label: "X", className: "modal-btn", onClick: () => modalManager.close() },
                { type: "embed", source: "https://www.youtube.com/watch?v=mMD63t-W0Os" },
                {
                    type: "button",
                    label: "NEXT",
                    className: "modal-btn modal-btn-next",
                    onClick: () => modalManager.close(() => this.openModal((index + 1) % 3)),
                },
            ],
        });
    }
}
