import type { Observer, AbstractMesh, SpotLight } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core";
import { Vector3 } from "@babylonjs/core";
import { createInteractiveImagePlane } from "../utils";
import { createSoftRedSpotLight } from "./spotlight";
import type { GameScene, GalleryItem, SceneLoadContext } from "./types";

export const SCENE1_WINDOW_CONFIGS = [
    { color: "#21432b99", left: "-320px", top: "140px" },
    { color: "#501d2599", left: "-250px", top: "-120px" },
    { color: "#3c284d99", left: "0px", top: "0px" },
    { color: "#1b3b5899", left: "220px", top: "-80px" },
    { color: "#39321899", left: "260px", top: "120px" },
];

const SPOT_POSITION = new Vector3(0, 3.2, 1.5);
const SPOT_TARGET = new Vector3(0, 1.8, 5);

const GALLERY_ITEMS: GalleryItem[] = [
    { title: "Image One", img: "images/i1.png", x: -6, r: -0.6, text: "Red themed popup." },
    { title: "Image Two", img: "images/i2.png", x: -3, r: -0.2, text: "Blue themed popup." },
    { title: "Image Three", img: "images/i3.png", x: 0, r: 0, text: "Green themed popup." },
    { title: "Image Four", img: "images/i4.png", x: 3, r: 0.2, text: "Gold themed popup." },
    {
        title: "Image Five",
        img: "images/i5.png",
        x: 6,
        r: 0.6,
        text: "Purple themed popup. Press Next to explore the floating gallery.",
        showNextButton: true,
    },
];

export class Scene1 implements GameScene {
    readonly id = "scene1";
    readonly meshes: AbstractMesh[] = [];

    private babylonScene: Scene | null = null;
    private renderObserver: Observer<Scene> | null = null;
    private spot: SpotLight | null = null;

    load(ctx: SceneLoadContext): void {
        this.babylonScene = ctx.scene;
        this.meshes.length = 0;

        GALLERY_ITEMS.forEach((item, index) => {
            const plane = createInteractiveImagePlane(ctx.scene, item, {
                isInteractionBlocked: ctx.isInteractionBlocked,
                onPick: () => ctx.onItemClick(index, item),
            });
            this.meshes.push(plane);
        });

        const spotDirection = SPOT_TARGET.subtract(SPOT_POSITION);
        this.spot = createSoftRedSpotLight("scene1Spot", SPOT_POSITION, spotDirection, ctx.scene, this.meshes);

        this.renderObserver = ctx.scene.onBeforeRenderObservable.add(() => {
            const t = performance.now() * 0.001;
            this.meshes.forEach((mesh, i) => {
                mesh.position.y = 1.8 + Math.sin(t * 1.4 + i) * 0.15;
            });
        });
    }

    unload(): void {
        if (this.renderObserver && this.babylonScene) {
            this.babylonScene.onBeforeRenderObservable.remove(this.renderObserver);
            this.renderObserver = null;
        }

        this.spot?.dispose();
        this.spot = null;

        for (const mesh of this.meshes) {
            mesh.dispose(false, true);
        }
        this.meshes.length = 0;
        this.babylonScene = null;
    }

    setMeshesPickable(pickable: boolean): void {
        for (const mesh of this.meshes) {
            mesh.isPickable = pickable;
        }
    }
}
