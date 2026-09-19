import { Axis, type AbstractMesh, Space } from "@babylonjs/core";
import { animationManager } from "../managers/animation";
import { cameraManager } from "../managers/camera";
import { lightManager } from "../managers/light";
import { objectManager } from "../managers/object";
import { sceneManager } from "../managers/scene";
import { subtitleManager } from "../managers/subtitle";
import type { GalleryItem, GameScene, SceneObject } from "../types";

type PortalItem = Pick<GalleryItem, "id" | "source" | "subtitle" | "nextSceneId"> &
    Partial<Pick<GalleryItem, "width" | "height" | "scale" | "y">>;

const PORTAL_COUNT = 2;
const PORTAL_SPACING = 4;
const PORTAL_CENTER_Z = 5;

const PORTALS: PortalItem[] = [
    {
        id: "portal-ns",
        source: "assets/ns/face.glb",
        subtitle: "Natálie Sedláčková",
        nextSceneId: "ns",
        scale: 6,
        y: -4,
    },
    {
        id: "portal-kv",
        source: "assets/kv/zdimacka.jpg",
        subtitle: "Kryštof Vitner",
        nextSceneId: "kv",
        width: 2.4,
        height: 3.4,
    },
];

function portalSlot(index: number): { x: number; z: number } {
    const center = (PORTAL_COUNT - 1) / 2;
    return {
        x: (index - center) * PORTAL_SPACING,
        z: PORTAL_CENTER_Z,
    };
}

export class SceneStart implements GameScene {
    readonly id = "sceneStart";
    readonly highlightMode: GameScene["highlightMode"] = "selectionOutline";
    private objects: SceneObject[] = [];

    async load(): Promise<void> {
        this.objects = await Promise.all(
            PORTALS.map(async (item, index) => {
                const { x, z } = portalSlot(index);
                const object = await objectManager.create(
                    { ...item, x, y: item.y ?? 1.8, z, r: 0 } satisfies GalleryItem,
                    this.highlightMode,
                );
                cameraManager.faceMeshToCamera(object.mesh);
                if (item.id === "portal-ns") {
                    object.mesh.rotate(Axis.Y, Math.PI, Space.LOCAL);
                }
                objectManager.interactive(object, {
                    onClick: () => {
                        subtitleManager.hide();
                        sceneManager.switchTo(item.nextSceneId!);
                    },
                    onHover: () => item.subtitle && subtitleManager.show(item.subtitle),
                    onHoverEnd: () => subtitleManager.hide(),
                });
                animationManager.add(`sceneStart-${index}`, object.mesh, {
                    preset: "float",
                    amplitude: 0.15,
                    speed: 1.4,
                    phase: index,
                });
                return object;
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
