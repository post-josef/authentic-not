import { animationManager } from "../managers/animation";
import { lightManager } from "../managers/light";
import { objectManager } from "../managers/object";
import { Color3, Vector3 } from "@babylonjs/core";
import type { Scene, Object3D } from "../types";

const OBJECTS: Object3D[] = [
    {
        source: "assets/ns/face.glb",
        targetScene: "ns",
        x: -2,
        y: -4,
        z: 5,
        ry: Math.PI,
        subtitle: "Natálie Sedláčková",
        scale: 6,
        highlight: "highlightLayer",
    },
    {
        source: "assets/kv/zdimacka.jpg",
        targetScene: "kv",
        x: 2,
        y: 1.8,
        z: 5,
        subtitle: "Kryštof Vitner",
        width: 2.4,
        height: 3.4,
        highlight: "highlightLayer",
    },
];

export class SceneStart implements Scene {
    async load(): Promise<void> {
        const portals = await Promise.all(
            OBJECTS.map(async (object, index) => {
                const mesh = await objectManager.create(object);
                animationManager.add(mesh, { preset: "float", speed: 1.4, phase: index });
                return mesh;
            }),
        );

        lightManager.createLight({
            x: 0,
            y: 3.2,
            z: 1.5,
            target: new Vector3(0, 1.8, 5),
            color: new Color3(1, 0.32, 0.32),
            intensity: 1.2,
            range: 18,
            meshes: portals,
        });
    }
}
