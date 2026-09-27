import { Color3, Vector3 } from "@babylonjs/core";
import { fogManager } from "../managers/fog";
import { lightManager } from "../managers/light";
import { modalManager } from "../managers/modal";
import { objectManager } from "../managers/object";
import type { Object3D, Scene } from "../types";
import "./scene-ns.css";

export class SceneNS implements Scene {
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

        const panels: Object3D[] = [
            {
                source: "assets/ns/1.mp4",
                x: -4.2,
                y: 1.7,
                z: 5.999,
                width: 3.04,
                height: 2.2,
                highlight: "highlightLayer",
                modalClassName: "modal-scene-ns",
                modal: [{ type: "embed", source: "https://www.youtube.com/watch?v=mMD63t-W0Os" }],
            },
            {
                source: "assets/ns/2.mp4",
                x: 0,
                y: 1.7,
                z: 5.999,
                width: 3.04,
                height: 2.2,
                highlight: "highlightLayer",
                modalClassName: "modal-scene-ns",
                modal: [{ type: "embed", source: "https://www.youtube.com/watch?v=mMD63t-W0Os" }],
            },
            {
                source: "assets/ns/3.mp4",
                x: 4.2,
                y: 1.7,
                z: 5.999,
                width: 3.04,
                height: 2.2,
                highlight: "highlightLayer",
                modalClassName: "modal-scene-ns",
                modal: [{ type: "embed", source: "https://www.youtube.com/watch?v=mMD63t-W0Os" }],
            },
        ];

        for (let index = 0; index < panels.length; index++) {
            const panel = panels[index];
            await objectManager.create({
                source: "assets/ns/frame.png",
                x: panel.x,
                y: 1.7,
                z: 6,
                width: 3.25,
                height: 2.7,
            });
            const video = await objectManager.create({ ...panel, modal: undefined, modalClassName: undefined });
            objectManager.interactive(video, {
                onClick: () => this.openModal(index, panels),
            });
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

    private openModal(index: number, panels: Object3D[]) {
        const panel = panels[index];
        modalManager.open({
            className: panel.modalClassName,
            content: [
                ...(panel.modal || []),
                {
                    type: "button",
                    label: "NEXT",
                    className: "modal-btn",
                    onClick: () => modalManager.close(() => this.openModal((index + 1) % panels.length, panels)),
                },
            ],
        });
    }
}
