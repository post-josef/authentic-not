import type { AbstractMesh } from "@babylonjs/core";
import { animationManager } from "../managers/animation";
import { lightManager } from "../managers/light";
import { sceneManager } from "../managers/scene";
import { createImagePlane } from "../objects/imagePlane";
import { openModal, wireInteractive, type SceneObject } from "../objects/sceneObject";
import { createGalleryModal } from "./modalContent";
import type { GalleryItem, GameScene, WindowConfig } from "./types";

const SCENE1_WINDOW_CONFIGS: WindowConfig[] = [
    { color: "#21432b99", left: "-320px", top: "140px" },
    { color: "#501d2599", left: "-250px", top: "-120px" },
    { color: "#3c284d99", left: "0px", top: "0px" },
    { color: "#1b3b5899", left: "220px", top: "-80px" },
    { color: "#39321899", left: "260px", top: "120px" },
];

const MODAL_CLASS = "modal-scene1";
const GALLERY_ITEMS: GalleryItem[] = [
    {
        title: "Row One",
        img: "assets/images/i1.png",
        x: -6,
        r: -0.6,
        embed: { provider: "youtube", videoId: "mMD63t-W0Os", autoplay: true, muted: true },
        text: "The line begins here — a soft red light spills across the first frame.",
    },
    {
        title: "Row Two",
        img: "assets/images/i2.png",
        x: -3,
        r: -0.2,
        embed: { provider: "youtube", videoId: "mMD63t-W0Os", autoplay: true, muted: true },
        text: "Each panel leans in slightly, drawing you further along the corridor.",
    },
    {
        title: "Row Three",
        img: "assets/images/i3.png",
        x: 0,
        r: 0,
        embed: { provider: "vimeo", videoId: "384166760", autoplay: true, muted: true },
        text: "At the center, the spot finds its mark and the image gently breathes.",
    },
    {
        title: "Row Four",
        img: "assets/images/i4.png",
        x: 3,
        r: 0.2,
        embed: { provider: "youtube", videoId: "mMD63t-W0Os", autoplay: true, muted: true },
        text: "The rhythm holds — quiet float, warm glow, one piece after another.",
    },
    {
        title: "Row Five",
        img: "assets/images/i5.png",
        x: 6,
        r: 0.6,
        embed: { provider: "youtube", videoId: "mMD63t-W0Os", autoplay: true, muted: true },
        text: "The row ends, but the gallery does not. Step into the drifting collection ahead.",
        nextSceneId: "scene2",
    },
];

export class Scene1 implements GameScene {
    readonly id = "scene1";
    readonly highlightMode = "border" as const;
    private objects: SceneObject[] = [];

    load(): void {
        const scene = sceneManager.getBabylonScene();
        this.objects = GALLERY_ITEMS.map((item, index) => {
            const object = createImagePlane(scene, item, this.highlightMode);
            wireInteractive(object, () =>
                openModal(createGalleryModal(item, SCENE1_WINDOW_CONFIGS[index], MODAL_CLASS)),
            );
            animationManager.add(`scene1-${index}`, object.mesh, {
                preset: "float",
                amplitude: 0.15,
                speed: 1.4,
                phase: index,
            });
            return object;
        });

        lightManager.createSpot("scene1Spot", [0, 3.2, 1.5], {
            target: [0, 1.8, 5],
            diffuse: [1, 0.32, 0.32],
            specular: [1, 0.35, 0.35],
            intensity: 1.2,
            range: 14,
            includedOnlyMeshes: this.getMeshes(),
            showFixture: true,
            fixture: { scale: 0.55, color: [1, 0.32, 0.32] },
        });
    }

    unload(): void {
        this.objects.forEach((object) => object.dispose());
        this.objects = [];
    }

    getMeshes(): AbstractMesh[] {
        return this.objects.map((object) => object.mesh);
    }
}
