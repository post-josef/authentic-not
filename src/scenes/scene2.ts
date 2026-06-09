import type { Observer, AbstractMesh } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core";
import { createInteractiveImagePlane } from "../utils";
import type { GameScene, GalleryItem, SceneLoadContext } from "./types";

export const SCENE2_WINDOW_CONFIGS = [
    { color: "#21432b99", left: "-320px", top: "140px" },
    { color: "#501d2599", left: "-250px", top: "-120px" },
    { color: "#3c284d99", left: "0px", top: "0px" },
    { color: "#1b3b5899", left: "220px", top: "-80px" },
    { color: "#39321899", left: "260px", top: "120px" },
];

const GALLERY_ITEMS: GalleryItem[] = [
    {
        title: "Drift One",
        img: "images/i2.png",
        x: -4.5,
        y: 2.4,
        z: 3,
        r: 0.35,
        text: "Orbiting gallery — each panel drifts on its own path.",
    },
    {
        title: "Drift Two",
        img: "images/i4.png",
        x: -1.8,
        y: 1.2,
        z: 6,
        r: -0.15,
        text: "Depth layers create a staggered, cinematic feel.",
    },
    {
        title: "Drift Three",
        img: "images/i1.png",
        x: 0,
        y: 2.8,
        z: 4.5,
        r: 0,
        text: "Center piece rises and falls with a slow pulse.",
    },
    {
        title: "Drift Four",
        img: "images/i5.png",
        x: 2.2,
        y: 1.5,
        z: 5.5,
        r: 0.2,
        text: "Gentle yaw oscillation adds life without distraction.",
    },
    {
        title: "Drift Five",
        img: "images/i3.png",
        x: 4.8,
        y: 2.1,
        z: 3.5,
        r: -0.4,
        text: "Return to the classic row layout anytime.",
        showNextButton: true,
    },
];

export class Scene2 implements GameScene {
    readonly id = "scene2";
    readonly meshes: AbstractMesh[] = [];

    private babylonScene: Scene | null = null;
    private renderObserver: Observer<Scene> | null = null;
    private basePositions: { x: number; y: number; z: number; r: number }[] = [];

    load(ctx: SceneLoadContext): void {
        this.babylonScene = ctx.scene;
        this.meshes.length = 0;
        this.basePositions = [];

        GALLERY_ITEMS.forEach((item, index) => {
            const plane = createInteractiveImagePlane(ctx.scene, item, {
                isInteractionBlocked: ctx.isInteractionBlocked,
                onPick: () => ctx.onItemClick(index, item),
            });
            this.meshes.push(plane);
            this.basePositions.push({
                x: item.x,
                y: item.y ?? 1.8,
                z: item.z ?? 5,
                r: item.r,
            });
        });

        this.renderObserver = ctx.scene.onBeforeRenderObservable.add(() => {
            const t = performance.now() * 0.001;
            this.meshes.forEach((mesh, i) => {
                const base = this.basePositions[i];
                const phase = i * 1.2;

                mesh.position.x = base.x + Math.cos(t * 0.7 + phase) * 0.25;
                mesh.position.y = base.y + Math.sin(t * 1.1 + phase) * 0.35;
                mesh.position.z = base.z + Math.sin(t * 0.5 + phase) * 0.2;
                mesh.rotation.y = base.r + Math.sin(t * 0.9 + phase) * 0.12;
                mesh.scaling.x = 1 + Math.sin(t * 2 + phase) * 0.03;
                mesh.scaling.y = 1 + Math.sin(t * 2 + phase) * 0.03;
            });
        });
    }

    unload(): void {
        if (this.renderObserver && this.babylonScene) {
            this.babylonScene.onBeforeRenderObservable.remove(this.renderObserver);
            this.renderObserver = null;
        }

        for (const mesh of this.meshes) {
            mesh.dispose(false, true);
        }
        this.meshes.length = 0;
        this.basePositions = [];
        this.babylonScene = null;
    }

    setMeshesPickable(pickable: boolean): void {
        for (const mesh of this.meshes) {
            mesh.isPickable = pickable;
        }
    }
}
