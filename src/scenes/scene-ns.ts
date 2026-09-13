import type { AbstractMesh } from "@babylonjs/core";
import "./scene-ns.css";
import { cameraManager } from "../managers/camera";
import { fogManager } from "../managers/fog";
import { lightManager } from "../managers/light";
import { modalManager } from "../managers/modal";
import { objectManager } from "../managers/object";
import { sceneManager } from "../managers/scene";
import type { GameScene, SceneObject } from "../types";

export class SceneNs implements GameScene {
    readonly id = "scene-ns";
    readonly highlightMode: GameScene["highlightMode"] = "highlightLayer";
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

        const panel1 = objectManager.createVideoPanel(
            {
                title: "nsPanel1",
                source: "assets/ns/1.mp4",
                x: -4.2,
                y: 1.7,
                z: 6,
                width: 3.04,
                height: 2.25,
                frame: {
                    source: "assets/ns/Video frame.png",
                    width: 4.58,
                    height: 3.35,
                    videoOffsetX: 0.11,
                },
            },
            this.highlightMode,
        );
        cameraManager.faceMeshToCamera(panel1.mesh);
        this.objects.push(panel1);

        const panel2 = objectManager.createVideoPanel(
            {
                title: "nsPanel2",
                source: "assets/ns/2.mp4",
                x: 0,
                y: 1.7,
                z: 6,
                width: 3.04,
                height: 2.25,
                frame: {
                    source: "assets/ns/Video frame.png",
                    width: 4.58,
                    height: 3.35,
                    videoOffsetX: 0.11,
                },
            },
            "border",
        );
        cameraManager.faceMeshToCamera(panel2.mesh);
        objectManager.interactive(panel2, { onClick: () => this.openModal(1) });
        this.objects.push(panel2);

        const panel3 = objectManager.createVideoPanel(
            {
                title: "nsPanel3",
                source: "assets/ns/3.mp4",
                x: 4.2,
                y: 1.7,
                z: 6,
                width: 3.04,
                height: 2.25,
            },
            "border",
        );
        cameraManager.faceMeshToCamera(panel3.mesh);
        objectManager.interactive(panel3, { onClick: () => this.openModal(2) });
        this.objects.push(panel3);

        const face = await objectManager.create(
            {
                id: "nsFace",
                source: "assets/ns/face1.glb",
                x: 0,
                y: -2.3,
                z: 16,
                r: 0,
                scale: 5,
                text: "",
            },
            this.highlightMode,
        );
        cameraManager.faceMeshToCamera(face.mesh);
        objectManager.setPickable(face, false);
        this.objects.push(face);

        lightManager.createSpot("sceneNsFace", [0, 6, 12], {
            target: [0, 0, 16],
            diffuse: [1, 0.8, 0.6],
            specular: [1, 0.6, 0.4],
            intensity: 12,
            range: 20,
            includedOnlyMeshes: objectManager.meshes(face),
            showFixture: true,
            fixture: { scale: 0.5, color: [1, 0.96, 0.9] },
        });
    }

    unload(): void {
        this.objects.forEach((object) => object.dispose());
        this.objects = [];
    }

    getMeshes(): AbstractMesh[] {
        return this.objects.flatMap((object) => objectManager.meshes(object));
    }

    private openModal(index: number): void {
        modalManager.open({
            pickableMeshes: sceneManager.getMeshes(),
            style: { className: "modal-scene-ns", width: "min(92vw, 800px)" },
            content: [
                {
                    type: "button",
                    label: "X",
                    className: "modal-scene-ns-close",
                    onClick: () => modalManager.close(),
                },
                {
                    type: "embed",
                    provider: "youtube",
                    videoId: "mMD63t-W0Os",
                    autoplay: true,
                    muted: true,
                    className: "modal-scene-ns-embed",
                },
                {
                    type: "button",
                    label: "NEXT",
                    className: "modal-scene-ns-next",
                    onClick: () => modalManager.close(() => this.openModal((index + 1) % 3)),
                },
            ],
        });
    }
}
