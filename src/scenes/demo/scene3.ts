import type { AbstractMesh } from "@babylonjs/core";
import { animationManager } from "../../managers/animation";
import { lightManager } from "../../managers/light";
import { modalManager } from "../../managers/modal";
import { objectManager } from "../../managers/object";
import { subtitleManager } from "../../managers/subtitle";
import type { GalleryItem, GameScene, SceneObject, WindowConfig } from "../../types";
import "./scene3.css";

const SCENE3_WINDOW_CONFIGS: WindowConfig[] = [
    { color: "#1a2d4d99", left: "-300px", top: "100px" },
    { color: "#2d1f4d99", left: "-180px", top: "-140px" },
    { color: "#1f3d4a99", left: "40px", top: "-40px" },
    { color: "#3d2a1f99", left: "200px", top: "60px" },
    { color: "#1f3d2a99", left: "280px", top: "150px" },
];

const MODAL_CLASS = "modal-scene3";
const RING_RADIUS = 5.5;
const RING_CENTER: [number, number, number] = [0, 2.2, 8];
const PANEL_COUNT = 5;
const GALLERY_ITEMS: GalleryItem[] = [
    {
        id: "1",
        subtitle: "Orbit One",
        source: "assets/images/i3.png",
        x: 0,
        y: 2.2,
        z: 8 + RING_RADIUS,
        r: 0,
        text: "Panels ride a slow ring — the whole constellation turns together.",
    },
    {
        id: "2",
        subtitle: "Orbit Two",
        source: "assets/images/i5.png",
        x: 0,
        y: 2.5,
        z: 8,
        r: 0,
        text: "Each frame faces the hub while the carousel drifts through space.",
    },
    {
        id: "3",
        subtitle: "Orbit Three",
        source: "assets/images/i1.png",
        x: 0,
        y: 1.9,
        z: 8,
        r: 0,
        text: "A cool hub light catches the edges as panels pass in front of one another.",
    },
    {
        id: "4",
        subtitle: "Orbit Four",
        source: "assets/images/i4.png",
        x: 0,
        y: 2.4,
        z: 8,
        r: 0,
        text: "Gentle tilt wobble keeps the ring from feeling mechanical.",
    },
    {
        id: "5",
        subtitle: "Orbit Five",
        source: "assets/images/i2.png",
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
    readonly highlightMode: GameScene["highlightMode"] = "selectionOutline";
    private objects: SceneObject[] = [];

    async load(): Promise<void> {
        this.objects = await Promise.all(
            GALLERY_ITEMS.map(async (item, index) => {
                const baseAngle = (index / PANEL_COUNT) * Math.PI * 2 - Math.PI / 2;
                const object = await objectManager.create(item, this.highlightMode);
                objectManager.interactive(object, {
                    onClick: () => {
                        subtitleManager.hide();
                        modalManager.openGallery(item, SCENE3_WINDOW_CONFIGS[index], MODAL_CLASS);
                    },
                    onHover: () => item.subtitle && subtitleManager.show(item.subtitle),
                    onHoverEnd: () => subtitleManager.hide(),
                });
                animationManager.add(`scene3-${index}`, object.mesh, {
                    preset: "orbit",
                    center: RING_CENTER,
                    radius: RING_RADIUS,
                    speed: 0.18,
                    startAngle: baseAngle,
                    heightOffset: (index - 2) * 0.28,
                    floatAmplitude: 0.18,
                    floatSpeed: 1.3,
                    floatPhase: index * 0.9,
                    faceCamera: true,
                    cameraSpotAngle: -Math.PI / 2,
                    cameraSpotWidth: 0.55,
                    tiltPhaseX: index * 0.7,
                    tiltPhaseZ: index * 0.5,
                });
                return object;
            }),
        );

        lightManager.createPoint("scene3Hub", RING_CENTER, {
            diffuse: [0.45, 0.65, 1],
            specular: [0.5, 0.7, 1],
            intensity: 0.85,
            range: 20,
            showFixture: true,
            fixture: { scale: 0.35, color: [0.45, 0.65, 1] },
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
