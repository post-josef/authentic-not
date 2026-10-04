import { animationManager } from "../managers/animation";
import { cameraManager } from "../managers/camera";
import { lightManager } from "../managers/light";
import { objectManager } from "../managers/object";
import { sceneManager } from "../managers/scene";
import { Color3, Vector3 } from "@babylonjs/core";
import type { Scene, Object3D } from "../types";

const OBJECTS: Object3D[] = [
    {
        source: "assets/mm/object.glb",
        subtitle: "Miroslav Mužík",
        targetScene: "mm",
        x: -6.4,
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
        scale: 1.3,
        highlight: "highlightLayer",
    },
    {
        source: "assets/kz/vstup.glb",
        subtitle: "Kristýna Zákostelecká",
        targetScene: "kz",
        x: 12,
        y: 1,
        z: 2,
        ry: Math.PI * 1.6,
        highlight: "highlightLayer",
    },
];

const MAX_ABS_X = Math.max(...OBJECTS.map((o) => Math.abs(o.x ?? 0)));

/** Pull X toward 0; sign from position, strength from index distance + |x|. */
function packedX(x: number, index: number, pull: number): number {
    if (!pull || x === 0) return x;
    const towardCenter = Math.sign(-x);
    const centerIndex = (OBJECTS.length - 1) / 2;
    const indexScale = 1 + Math.abs(index - centerIndex) / Math.max(centerIndex, 1);
    const distScale = Math.abs(x) / MAX_ABS_X;
    return x + towardCenter * pull * indexScale * distScale;
}

export class SceneStart implements Scene {
    async load(): Promise<void> {
        const small = matchMedia("(max-width: 780px)").matches;
        const medium = matchMedia("(max-width: 1200px)").matches;
        if (small) {
            cameraManager.walkPosition(new Vector3(0, 1.7, -18)); // 6m further back from default -10 on Z
        } else if (medium) {
            cameraManager.walkPosition(new Vector3(0, 1.7, -14));
        }

        const portals = await Promise.all(
            OBJECTS.map(async (object, index) => {
                const mesh = await objectManager.create({
                    ...object,
                    x: packedX(object.x ?? 0, index, small ? (index === 0 ? 4 : 2.2) : medium ? 0.6 : 0),
                    y: (object.y ?? 0) + (small ? (index % 2 ? -3 : 3) : 0),
                });
                animationManager.add(mesh, { preset: "float", speed: 1.4, phase: index });
                return mesh;
            }),
        );

        sceneManager.resetHistory();

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
