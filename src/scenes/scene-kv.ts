import { Vector3 } from "@babylonjs/core";
import { animationManager } from "../managers/animation";
import { cameraManager } from "../managers/camera";
import { lightManager } from "../managers/light";
import { objectManager } from "../managers/object";
import type { Scene } from "../types";

const MASK_TARGET = new Vector3(0, 0, 12);

const CYLINDER_VIDEOS: Record<string, string> = {
    "valec-vrsek": "assets/kv/valec-vrsek.mp4",
    "valec-spodek": "assets/kv/valec-spodek.mp4",
    "valec-bok1": "assets/kv/valec-bok1.mp4",
    "valec-bok2": "assets/kv/valec-bok2.mp4",
    "valec-bok3": "assets/kv/valec-bok3.mp4",
};

export class SceneKv implements Scene {
    async load(): Promise<void> {
        cameraManager.setOrbit({
            target: MASK_TARGET,
            distance: 40,
            height: 10,
            maxDistance: 55,
        });

        const cylinder = await objectManager.create({
            source: "assets/kv/valec.glb",
            x: 0,
            y: 0,
            z: 12,
        });
        animationManager.add(cylinder, { preset: "rotate", speed: -0.1 });
        objectManager.applyMappedVideoTextures(cylinder, CYLINDER_VIDEOS);

        const face = await objectManager.create({
            source: "assets/kv/mask.glb",
            scale: 2,
            x: 0,
            y: 0,
            z: 12,
        });
        animationManager.add(face, { preset: "float", speed: 0.6, amplitude: 0.2 });

        lightManager.createLight({
            x: 0,
            y: 6,
            z: 6,
            target: MASK_TARGET,
            meshes: [face],
        });
    }
}
