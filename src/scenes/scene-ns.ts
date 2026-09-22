import { Axis, type AbstractMesh, Space } from "@babylonjs/core";
import { cameraManager } from "../managers/camera";
import { fogManager } from "../managers/fog";
import { lightManager } from "../managers/light";
import { modalManager } from "../managers/modal";
import { objectManager } from "../managers/object";
import type { Scene, SceneObject } from "../types";
import "./scene-ns.css";

export class SceneNs implements Scene {
    private objects: SceneObject[] = [];

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
            const frame = await objectManager.create({
                source: "assets/ns/frame.png",
                x,
                y: 1.7,
                z: 6,
                width: 3.25,
                height: 2.7,
                highlight: "border",
            });
            const panel = await objectManager.create({
                source: `assets/ns/${index + 1}.mp4`,
                x,
                y: 1.7,
                z: 5.999,
                width: 3.04,
                height: 2.2,
                highlight: "border",
            });
            frame.mesh.lookAt(cameraManager.getCamera().position);
            frame.mesh.rotate(Axis.Y, Math.PI, Space.LOCAL);
            panel.mesh.lookAt(cameraManager.getCamera().position);
            panel.mesh.rotate(Axis.Y, Math.PI, Space.LOCAL);
            objectManager.setPickable(frame, false);
            objectManager.interactive(panel, { onClick: () => this.openModal(index) });
            this.objects.push(frame, panel);
        }

        const face = await objectManager.create({
            source: "assets/ns/face.glb",
            x: 0,
            y: -2.3,
            z: 16,
            scale: 5,
        });
        face.mesh.lookAt(cameraManager.getCamera().position);
        objectManager.setPickable(face, false);
        this.objects.push(face);

        lightManager.createSpot("sceneNsFace", [0, 6, 12], {
            target: [0, 0, 16],
            diffuse: [1, 0.8, 0.6],
            specular: [1, 0.6, 0.4],
            intensity: 12,
            range: 20,
            includedOnlyMeshes: objectManager.meshes(face),
            // fixture: { scale: 0.5, color: [1, 0.96, 0.9] },
        });
    }

    unload() {
        this.objects.forEach((object) => object.dispose());
        this.objects = [];
    }

    getMeshes(): AbstractMesh[] {
        return this.objects.flatMap((object) => objectManager.meshes(object));
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
