import type { Observer, AbstractMesh } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core";
import { Color3, PointLight, Vector3 } from "@babylonjs/core";
import { createImagePlane } from "../objects/imagePlane";
import { openModal, wireInteractive, type SceneObject } from "../objects/sceneObject";
import type { SceneContext } from "../managers/types";
import { createGalleryModal } from "./modalContent";
import type { GameScene, GalleryItem } from "./types";

export const SCENE4_WINDOW_CONFIGS = [
    { color: "#4a302099", left: "-280px", top: "90px" },
    { color: "#3d281899", left: "-160px", top: "-130px" },
    { color: "#5c3a1499", left: "20px", top: "-50px" },
    { color: "#4a2d1a99", left: "210px", top: "40px" },
    { color: "#3d351899", left: "290px", top: "140px" },
];

const SCENE4_MODAL_CLASS = "modal-scene4";

const LOOP_A = 4.2;
const LOOP_CENTER_Z = 5.5;
const LOOP_SPEED = 0.14;
const PANEL_COUNT = 5;

const GALLERY_ITEMS: GalleryItem[] = [
    {
        title: "Loop One",
        img: "images/i3.png",
        x: 0,
        y: 2.2,
        z: LOOP_CENTER_Z,
        r: 0,
        text: "The path bends into a figure-eight — panels trace an endless crossing.",
    },
    {
        title: "Loop Two",
        img: "images/i2.png",
        x: 0,
        y: 2.2,
        z: LOOP_CENTER_Z,
        r: 0,
        text: "At the crossover, heights diverge — one rises as another dips below.",
    },
    {
        title: "Loop Three",
        img: "images/i5.png",
        x: 0,
        y: 2.2,
        z: LOOP_CENTER_Z,
        r: 0,
        text: "A warm ember light hangs at the knot, catching every passing frame.",
    },
    {
        title: "Loop Four",
        img: "images/i1.png",
        x: 0,
        y: 2.2,
        z: LOOP_CENTER_Z,
        r: 0,
        text: "Hover brings a soft bloom — the glow layer answers like a held breath.",
    },
    {
        title: "Loop Five",
        img: "images/i4.png",
        x: 0,
        y: 2.2,
        z: LOOP_CENTER_Z,
        r: 0,
        text: "The journey closes where it began. Return to the quiet row gallery.",
        nextSceneId: "scene1",
    },
];

function loopPosition(t: number): { x: number; y: number; z: number; tangentX: number; tangentZ: number } {
    const x = LOOP_A * Math.cos(t);
    const z = LOOP_CENTER_Z + LOOP_A * Math.sin(t) * Math.cos(t);
    const y = 2.2 + Math.sin(t * 2) * 0.65;
    const tangentX = -LOOP_A * Math.sin(t);
    const tangentZ = LOOP_A * Math.cos(2 * t);
    return { x, y, z, tangentX, tangentZ };
}

export class Scene4 implements GameScene {
    readonly id = "scene4";
    readonly highlightMode = "glowLayer" as const;

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
                    openModal(ctx, createGalleryModal(item, SCENE4_WINDOW_CONFIGS[index], SCENE4_MODAL_CLASS)),
            });
            this.objects.push(object);
        });

        const ember = new PointLight("scene4Ember", new Vector3(0, 2.8, LOOP_CENTER_Z), ctx.babylonScene);
        ember.diffuse = new Color3(1, 0.55, 0.25);
        ember.specular = new Color3(1, 0.45, 0.2);
        ember.intensity = 1.3;
        ember.range = 18;
        ctx.light.track(ember);

        this.renderObserver = ctx.babylonScene.onBeforeRenderObservable.add(() => {
            const time = performance.now() * 0.001;

            this.objects.forEach((object, i) => {
                const param = time * LOOP_SPEED + (i / PANEL_COUNT) * Math.PI * 2;
                const pos = loopPosition(param);
                const mesh = object.mesh;

                mesh.position.set(pos.x, pos.y, pos.z);
                mesh.rotation.y = Math.atan2(pos.tangentX, pos.tangentZ);
                mesh.rotation.x = Math.sin(time * 1.4 + i) * 0.05;
                mesh.rotation.z = Math.cos(time * 1.1 + i * 0.8) * 0.04;
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
