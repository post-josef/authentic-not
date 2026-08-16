import type { AbstractMesh } from "@babylonjs/core";
import { animationManager } from "../managers/animation";
import { backgroundManager } from "../managers/background";
import { lightManager } from "../managers/light";
import { sceneManager } from "../managers/scene";
import { createImagePlane } from "../objects/imagePlane";
import { openModal, wireInteractive, type SceneObject } from "../objects/sceneObject";
import { createGalleryModal } from "./modalContent";
import type { GalleryItem, GameScene, WindowConfig } from "./types";

const SCENE4_WINDOW_CONFIGS: WindowConfig[] = [
    { color: "#4a302099", left: "-280px", top: "90px" },
    { color: "#3d281899", left: "-160px", top: "-130px" },
    { color: "#5c3a1499", left: "20px", top: "-50px" },
    { color: "#4a2d1a99", left: "210px", top: "40px" },
    { color: "#3d351899", left: "290px", top: "140px" },
];

const MODAL_CLASS = "modal-scene4";
const LOOP_WIDTH = 4.2;
const LOOP_CENTER_Z = 5.5;
const LOOP_SPEED = 0.14;
const PANEL_COUNT = 5;
const ENVIRONMENT_URL = "https://assets.babylonjs.com/environments/environmentSpecular.env";
const GALLERY_ITEMS: GalleryItem[] = [
    {
        title: "Loop One",
        img: "assets/images/i3.png",
        x: 0,
        y: 2.2,
        z: LOOP_CENTER_Z,
        r: 0,
        text: "The path bends into a figure-eight — panels trace an endless crossing.",
    },
    {
        title: "Loop Two",
        img: "assets/images/i2.png",
        x: 0,
        y: 2.2,
        z: LOOP_CENTER_Z,
        r: 0,
        text: "At the crossover, heights diverge — one rises as another dips below.",
    },
    {
        title: "Loop Three",
        img: "assets/images/i5.png",
        x: 0,
        y: 2.2,
        z: LOOP_CENTER_Z,
        r: 0,
        text: "A warm ember light hangs at the knot, catching every passing frame.",
    },
    {
        title: "Loop Four",
        img: "assets/images/i1.png",
        x: 0,
        y: 2.2,
        z: LOOP_CENTER_Z,
        r: 0,
        text: "Hover brings a soft bloom — the glow layer answers like a held breath.",
    },
    {
        title: "Loop Five",
        img: "assets/images/i4.png",
        x: 0,
        y: 2.2,
        z: LOOP_CENTER_Z,
        r: 0,
        text: "The journey closes where it began. Return to the quiet row gallery.",
        nextSceneId: "scene1",
    },
];

export class Scene4 implements GameScene {
    readonly id = "scene4";
    readonly highlightMode: GameScene["highlightMode"] = "glowLayer";
    private objects: SceneObject[] = [];

    load(): void {
        const scene = sceneManager.getBabylonScene();
        backgroundManager.setEnvironment(ENVIRONMENT_URL, {
            intensity: 0.7,
            rotation: Math.PI * 0.15,
            size: 500,
            blur: 0.15,
        });

        this.objects = GALLERY_ITEMS.map((item, index) => {
            const object = createImagePlane(scene, item, this.highlightMode);
            wireInteractive(object, () =>
                openModal(createGalleryModal(item, SCENE4_WINDOW_CONFIGS[index], MODAL_CLASS)),
            );
            animationManager.add(`scene4-${index}`, object.mesh, {
                preset: "figureEight",
                center: [0, 2.2, LOOP_CENTER_Z],
                width: LOOP_WIDTH,
                height: 0.65,
                speed: LOOP_SPEED,
                phase: (index / PANEL_COUNT) * Math.PI * 2,
                tiltPhase: index,
            });
            return object;
        });

        lightManager.createPoint("scene4Ember", [0, 2.8, LOOP_CENTER_Z], {
            diffuse: [1, 0.55, 0.25],
            specular: [1, 0.45, 0.2],
            intensity: 1.3,
            range: 18,
            showFixture: true,
            fixture: { scale: 0.35, color: [1, 0.55, 0.25] },
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
