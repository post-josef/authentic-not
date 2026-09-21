import { Axis, type AbstractMesh, Space } from "@babylonjs/core";
import { animationManager } from "../managers/animation";
import { cameraManager } from "../managers/camera";
import { lightManager } from "../managers/light";
import { objectManager } from "../managers/object";
import { sceneManager } from "../managers/scene";
import { subtitleManager } from "../managers/subtitle";
import type { Scene, Object3D, SceneObject } from "../types";

const PORTAL_COUNT = 2;
const PORTAL_SPACING = 4;
const PORTAL_CENTER_Z = 5;

const OBJECTS: Object3D[] = [
    {
        id: "portal-ns",
        source: "assets/ns/face.glb",
        x: 0,
        y: -4,
        z: PORTAL_CENTER_Z,
        subtitle: "Natálie Sedláčková",
        scale: 6,
        highlight: "highlightLayer",
    },
    {
        id: "portal-kv",
        source: "assets/kv/zdimacka.jpg",
        x: 0,
        y: 1.8,
        z: PORTAL_CENTER_Z,
        subtitle: "Kryštof Vitner",
        width: 2.4,
        height: 3.4,
        highlight: "highlightLayer",
    },
];

function portalSlot(index: number): { x: number; z: number } {
    const center = (PORTAL_COUNT - 1) / 2;
    return {
        x: (index - center) * PORTAL_SPACING,
        z: PORTAL_CENTER_Z,
    };
}

export class SceneStart implements Scene {
    private objects: SceneObject[] = [];

    async load(): Promise<void> {
        this.objects = await Promise.all(
            OBJECTS.map(async (object, index) => {
                const { x, z } = portalSlot(index);
                const instance = await objectManager.create({ ...object, x, z });
                cameraManager.faceMeshToCamera(instance.mesh);
                if (object.id === "portal-ns") {
                    instance.mesh.rotate(Axis.Y, Math.PI, Space.LOCAL);
                }
                const targetScene = object.id === "portal-ns" ? "ns" : "kv";
                objectManager.interactive(instance, {
                    onClick: () => {
                        subtitleManager.hide();
                        sceneManager.switchTo(targetScene);
                    },
                    onHover: () => object.subtitle && subtitleManager.show(object.subtitle),
                    onHoverEnd: () => subtitleManager.hide(),
                });
                animationManager.add(`sceneStart-${index}`, instance.mesh, {
                    preset: "float",
                    amplitude: 0.15,
                    speed: 1.4,
                    phase: index,
                });
                return instance;
            }),
        );

        lightManager.createSpot("sceneStartSpot", [0, 3.2, 1.5], {
            target: [0, 1.8, PORTAL_CENTER_Z],
            diffuse: [1, 0.32, 0.32],
            specular: [1, 0.35, 0.35],
            intensity: 1.2,
            range: 18,
            includedOnlyMeshes: this.getMeshes(),
            // fixture: { scale: 0.55, color: [1, 0.32, 0.32] },
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
