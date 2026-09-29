import { animationManager } from "../managers/animation";
import { lightManager } from "../managers/light";
import { objectManager } from "../managers/object";
import { Color3, Vector3 } from "@babylonjs/core";
import type { Scene, Object3D } from "../types";

const OBJECTS: Object3D[] = [
    {
        source: "assets/mm/object.glb",
        subtitle: "Miroslav Mužík",
        targetScene: "mm",
        x: -6,
        y: 1.8,
        z: 5,
        scale: 0.3,
        highlight: "highlightLayer",
    },
    {
        source: "assets/ns/zaves.glb",
        subtitle: "Natálie Sedláčková",
        targetScene: "ns",
        x: -2,
        y: 2,
        z: 6,
        // ry: Math.PI / 4,
        scale: 5,
        highlight: "highlightLayer",
    },
    {
        source: "assets/kv/nahled.glb",
        subtitle: "Kryštof Vitner",
        targetScene: "kv",
        x: 2,
        y: 2.5,
        z: 5,
        scale: 1.25,
        highlight: "highlightLayer",
    },
    {
        source: "assets/kz/vstup.glb",
        subtitle: "Kristýna Zákostelecká",
        targetScene: "kz",
        x: 11.2,
        y: 1,
        z: 2,
        ry: Math.PI * 1.6,
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
