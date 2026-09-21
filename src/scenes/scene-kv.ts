import { Vector3, type AbstractMesh } from "@babylonjs/core";
import { cameraManager } from "../managers/camera";
import { lightManager } from "../managers/light";
import { objectManager } from "../managers/object";
import type { Scene, SceneObject } from "../types";

const MASK_TARGET = new Vector3(0, 0, 12);

const CYLINDER_VIDEOS: Record<string, string> = {
    "valec-vrsek": "assets/kv/valec-vrsek.mp4",
    "valec-spodek": "assets/kv/valec-spodek.mp4",
    "valec-bok1": "assets/kv/valec-bok1.mp4",
    "valec-bok2": "assets/kv/valec-bok2.mp4",
    "valec-bok3": "assets/kv/valec-bok3.mp4",
};

export class SceneKv implements Scene {
    private objects: SceneObject[] = [];

    async load(): Promise<void> {
        cameraManager.setOrbit({
            target: MASK_TARGET,
            distance: 30,
        });

        const cylinder = await objectManager.create({
            id: "kv-cylinder",
            source: "assets/kv/valec.glb",
            x: 0,
            y: 0,
            z: 12,
        });
        this.objects.push(objectManager.applyMappedVideoTextures(cylinder, CYLINDER_VIDEOS, { invertY: true }));

        const face = await objectManager.create({
            id: "kv-mask",
            source: "assets/kv/mask.glb",
            x: 0,
            y: 0,
            z: 12,
        });
        this.objects.push(face);

        lightManager.createSpot("sceneKvFace", [0, 6, 6], {
            target: [MASK_TARGET.x, MASK_TARGET.y, MASK_TARGET.z],
            diffuse: [1, 0.8, 0.6],
            specular: [1, 0.6, 0.4],
            intensity: 40,
            range: 20,
            includedOnlyMeshes: objectManager.meshes(face),
        });
    }

    unload(): void {
        this.objects.forEach((object) => object.dispose());
        this.objects = [];
    }

    getMeshes(): AbstractMesh[] {
        return this.objects.flatMap((object) => objectManager.meshes(object));
    }
}
