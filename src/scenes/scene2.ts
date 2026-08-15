import type { AbstractMesh } from "@babylonjs/core";
import { animationManager } from "../managers/animation";
import { audioManager } from "../managers/audio";
import { fogManager } from "../managers/fog";
import { sceneManager } from "../managers/scene";
import { createImagePlane } from "../objects/imagePlane";
import { openModal, wireInteractive, type SceneObject } from "../objects/sceneObject";
import { createGalleryModal } from "./modalContent";
import type { GalleryItem, GameScene, WindowConfig } from "./types";

const SCENE2_WINDOW_CONFIGS: WindowConfig[] = [
    { color: "#21432b99", left: "-320px", top: "140px" },
    { color: "#501d2599", left: "-250px", top: "-120px" },
    { color: "#3c284d99", left: "0px", top: "0px" },
    { color: "#1b3b5899", left: "220px", top: "-80px" },
    { color: "#39321899", left: "260px", top: "120px" },
];

const MODAL_CLASS = "modal-scene2";
const KICK_SOUND = "scene2-kick";
const COWBELL_SOUND = "scene2-cowbell";
const MICROWAVE_SOUND = "scene2-microwave";
const GALLERY_ITEMS: GalleryItem[] = [
    {
        title: "Drift One",
        img: "assets/images/i2.png",
        x: -4.5,
        y: 2.4,
        z: 3,
        r: 0.35,
        text: "Orbiting gallery — each panel drifts on its own path.",
    },
    {
        title: "Drift Two",
        img: "assets/images/i4.png",
        x: -1.8,
        y: 1.2,
        z: 6,
        r: -0.15,
        text: "Depth layers create a staggered, cinematic feel.",
    },
    {
        title: "Drift Three",
        img: "assets/images/i1.png",
        x: 0,
        y: 2.8,
        z: 4.5,
        r: 0,
        text: "Center piece rises and falls with a slow pulse.",
    },
    {
        title: "Drift Four",
        img: "assets/images/i5.png",
        x: 2.2,
        y: 1.5,
        z: 5.5,
        r: 0.2,
        text: "Gentle yaw oscillation adds life without distraction.",
    },
    {
        title: "Drift Five",
        img: "assets/images/i3.png",
        x: 4.8,
        y: 2.1,
        z: 3.5,
        r: -0.4,
        text: "Continue to the orbital ring gallery.",
        nextSceneId: "scene3",
    },
];

export class Scene2 implements GameScene {
    readonly id = "scene2";
    readonly highlightMode = "highlightLayer" as const;
    private objects: SceneObject[] = [];

    load(): void {
        const scene = sceneManager.getBabylonScene();
        audioManager.load(KICK_SOUND, "assets/audio/kick.wav", { volume: 0.55 });
        audioManager.load(COWBELL_SOUND, "assets/audio/cowbell.wav", { volume: 0.45 });
        audioManager.load(MICROWAVE_SOUND, "assets/audio/microwave.wav", {
            volume: 0.55,
            persist: true,
        });

        fogManager.set({
            mode: "exp2",
            color: [0.16, 0.19, 0.26],
            density: 0.022,
        });
        fogManager.setMist({
            color: [0.58, 0.65, 0.78],
            opacity: 0.05,
            count: 260,
            size: [7, 16],
            center: [0, 2.2, 4.5],
            extents: [16, 4.5, 14],
            speed: 0.3,
            followCamera: true,
        });

        this.objects = GALLERY_ITEMS.map((item, index) => {
            const object = createImagePlane(scene, item, this.highlightMode);
            wireInteractive(object, () => {
                audioManager.play(index % 2 === 0 ? KICK_SOUND : COWBELL_SOUND);
                openModal(
                    createGalleryModal(item, SCENE2_WINDOW_CONFIGS[index], MODAL_CLASS, {
                        onNext: () => audioManager.play(MICROWAVE_SOUND),
                    }),
                );
            });
            animationManager.addMany(`scene2-${index}`, object.mesh, [
                {
                    preset: "drift",
                    amplitude: [0.25, 0.35, 0.2],
                    speed: [0.7, 1.1, 0.5],
                    yawAmplitude: 0.12,
                    yawSpeed: 0.9,
                    phase: index * 1.2,
                },
                {
                    preset: "pulse",
                    min: 0.97,
                    max: 1.03,
                    speed: 2,
                    phase: index * 1.2,
                },
            ]);
            return object;
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
