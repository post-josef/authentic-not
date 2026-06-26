import type { Observer, AbstractMesh } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core";
import { Color3, PointLight, Vector3 } from "@babylonjs/core";
import { createImagePlane } from "../objects/imagePlane";
import { openModal, wireInteractive, type SceneObject } from "../objects/sceneObject";
import type { SceneContext } from "../managers/types";
import { createGalleryModal } from "./modalContent";
import type { GameScene, GalleryItem } from "./types";

export const SCENE3_WINDOW_CONFIGS = [
    { color: "#1a2d4d99", left: "-300px", top: "100px" },
    { color: "#2d1f4d99", left: "-180px", top: "-140px" },
    { color: "#1f3d4a99", left: "40px", top: "-40px" },
    { color: "#3d2a1f99", left: "200px", top: "60px" },
    { color: "#1f3d2a99", left: "280px", top: "150px" },
];

const SCENE3_MODAL_CLASS = "modal-scene3";

const RING_RADIUS = 5.5;
const RING_CENTER = { x: 0, y: 2.2, z: 8 };
const PANEL_COUNT = 5;
const DEFAULT_CAMERA = { x: 0, z: -10 };
/** Orbit angle where a panel passes nearest the default camera (between hub and viewer). */
const CAMERA_SPOT_ANGLE = -Math.PI / 2;
/** Radians — wider = longer "show to viewer" moment. */
const CAMERA_SPOT_WIDTH = 0.55;

function normalizeAngle(a: number): number {
    let n = a;
    while (n > Math.PI) n -= Math.PI * 2;
    while (n < -Math.PI) n += Math.PI * 2;
    return n;
}

function lerpAngle(from: number, to: number, t: number): number {
    return from + normalizeAngle(to - from) * t;
}

function smoothstep(t: number): number {
    const c = Math.max(0, Math.min(1, t));
    return c * c * (3 - 2 * c);
}

const GALLERY_ITEMS: GalleryItem[] = [
    {
        title: "Orbit One",
        img: "images/i3.png",
        x: 0,
        y: 2.2,
        z: 8 + RING_RADIUS,
        r: 0,
        text: "Panels ride a slow ring — the whole constellation turns together.",
    },
    {
        title: "Orbit Two",
        img: "images/i5.png",
        x: 0,
        y: 2.5,
        z: 8,
        r: 0,
        text: "Each frame faces the hub while the carousel drifts through space.",
    },
    {
        title: "Orbit Three",
        img: "images/i1.png",
        x: 0,
        y: 1.9,
        z: 8,
        r: 0,
        text: "A cool hub light catches the edges as panels pass in front of one another.",
    },
    {
        title: "Orbit Four",
        img: "images/i4.png",
        x: 0,
        y: 2.4,
        z: 8,
        r: 0,
        text: "Gentle tilt wobble keeps the ring from feeling mechanical.",
    },
    {
        title: "Orbit Five",
        img: "images/i2.png",
        x: 0,
        y: 2.1,
        z: 8,
        r: 0,
        text: "Follow the figure-eight — a warmer loop lies ahead.",
        nextSceneId: "scene4",
    },
];

export class Scene3 implements GameScene {
    readonly id = "scene3";
    readonly highlightMode = "selectionOutline" as const;

    private babylonScene: Scene | null = null;
    private renderObserver: Observer<Scene> | null = null;
    private objects: SceneObject[] = [];

    load(ctx: SceneContext): void {
        this.babylonScene = ctx.babylonScene;
        this.objects = [];

        GALLERY_ITEMS.forEach((item, index) => {
            const object = createImagePlane(ctx.babylonScene, item, this.highlightMode);
            wireInteractive(object, {
                ctx,
                onPick: () =>
                    openModal(
                        ctx,
                        createGalleryModal(item, SCENE3_WINDOW_CONFIGS[index], SCENE3_MODAL_CLASS),
                    ),
            });
            this.objects.push(object);
        });

        const hub = new PointLight("scene3Hub", new Vector3(RING_CENTER.x, RING_CENTER.y, RING_CENTER.z), ctx.babylonScene);
        hub.diffuse = new Color3(0.45, 0.65, 1);
        hub.specular = new Color3(0.5, 0.7, 1);
        hub.intensity = 0.85;
        hub.range = 20;
        ctx.light.track(hub);

        this.renderObserver = ctx.babylonScene.onBeforeRenderObservable.add(() => {
            const t = performance.now() * 0.001;
            const ringAngle = t * 0.18;

            this.objects.forEach((object, i) => {
                const baseAngle = (i / PANEL_COUNT) * Math.PI * 2 - Math.PI / 2;
                const angle = baseAngle + ringAngle;
                const mesh = object.mesh;
                const heightBias = (i - 2) * 0.28;

                mesh.position.x = RING_CENTER.x + Math.cos(angle) * RING_RADIUS;
                mesh.position.z = RING_CENTER.z + Math.sin(angle) * RING_RADIUS;
                mesh.position.y = RING_CENTER.y + heightBias + Math.sin(t * 1.3 + i * 0.9) * 0.18;

                const orbitY = Math.atan2(-Math.sin(angle), Math.cos(angle));
                const cameraY = Math.atan2(
                    DEFAULT_CAMERA.x - mesh.position.x,
                    DEFAULT_CAMERA.z - mesh.position.z,
                );
                const spotProximity = smoothstep(1 - Math.abs(normalizeAngle(angle - CAMERA_SPOT_ANGLE)) / CAMERA_SPOT_WIDTH);

                mesh.rotation.y = lerpAngle(orbitY, cameraY, spotProximity);
                const tiltScale = 1 - spotProximity * 0.85;
                mesh.rotation.x = Math.sin(t * 1.6 + i * 0.7) * 0.06 * tiltScale;
                mesh.rotation.z = Math.cos(t * 2.1 + i * 0.5) * 0.04 * tiltScale;
            });
        });
    }

    unload(): void {
        if (this.renderObserver && this.babylonScene) {
            this.babylonScene.onBeforeRenderObservable.remove(this.renderObserver);
            this.renderObserver = null;
        }

        for (const object of this.objects) {
            object.dispose();
        }
        this.objects = [];
        this.babylonScene = null;
    }

    getMeshes(): AbstractMesh[] {
        return this.objects.map((o) => o.mesh);
    }

    setMeshesPickable(pickable: boolean): void {
        for (const object of this.objects) {
            object.mesh.isPickable = pickable;
        }
    }
}
