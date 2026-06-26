import type { Observer, AbstractMesh } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core";
import { Vector3 } from "@babylonjs/core";
import { createImagePlane } from "../objects/imagePlane";
import { openModal, wireInteractive, type SceneObject } from "../objects/sceneObject";
import type { SceneContext } from "../managers/types";
import { createSoftRedSpotLight } from "./spotlight";
import { createGalleryModal } from "./modalContent";
import type { GameScene, GalleryItem } from "./types";

export const SCENE1_WINDOW_CONFIGS = [
    { color: "#21432b99", left: "-320px", top: "140px" },
    { color: "#501d2599", left: "-250px", top: "-120px" },
    { color: "#3c284d99", left: "0px", top: "0px" },
    { color: "#1b3b5899", left: "220px", top: "-80px" },
    { color: "#39321899", left: "260px", top: "120px" },
];

const SCENE1_MODAL_CLASS = "modal-scene1";

const SPOT_POSITION = new Vector3(0, 3.2, 1.5);
const SPOT_TARGET = new Vector3(0, 1.8, 5);

const GALLERY_ITEMS: GalleryItem[] = [
    {
        title: "Row One",
        img: "images/i1.png",
        x: -6,
        r: -0.6,
        text: "The line begins here — a soft red light spills across the first frame.",
    },
    {
        title: "Row Two",
        img: "images/i2.png",
        x: -3,
        r: -0.2,
        text: "Each panel leans in slightly, drawing you further along the corridor.",
    },
    {
        title: "Row Three",
        img: "images/i3.png",
        x: 0,
        r: 0,
        text: "At the center, the spot finds its mark and the image gently breathes.",
    },
    {
        title: "Row Four",
        img: "images/i4.png",
        x: 3,
        r: 0.2,
        text: "The rhythm holds — quiet float, warm glow, one piece after another.",
    },
    {
        title: "Row Five",
        img: "images/i5.png",
        x: 6,
        r: 0.6,
        text: "The row ends, but the gallery does not. Step into the drifting collection ahead.",
        nextSceneId: "scene2",
    },
];

export class Scene1 implements GameScene {
    readonly id = "scene1";
    readonly highlightMode = "border" as const;

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
                    openModal(ctx, createGalleryModal(item, SCENE1_WINDOW_CONFIGS[index], SCENE1_MODAL_CLASS)),
            });
            this.objects.push(object);
        });

        const spotDirection = SPOT_TARGET.subtract(SPOT_POSITION);
        const spot = createSoftRedSpotLight(
            "scene1Spot",
            SPOT_POSITION,
            spotDirection,
            ctx.babylonScene,
            this.getMeshes(),
        );
        ctx.light.track(spot);

        this.renderObserver = ctx.babylonScene.onBeforeRenderObservable.add(() => {
            const t = performance.now() * 0.001;
            this.objects.forEach((object, i) => {
                object.mesh.position.y = 1.8 + Math.sin(t * 1.4 + i) * 0.15;
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
