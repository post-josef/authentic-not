import type { AbstractMesh } from "@babylonjs/core";
import { animationManager } from "../../managers/animation";
import { lightManager } from "../../managers/light";
import { objectManager } from "../../managers/object";
import { openGalleryItemModal } from "../../managers/scene";
import { subtitleManager } from "../../managers/subtitle";
import type { GalleryItem, GameScene, SceneObject, WindowConfig } from "../../types";
import "./scene1.css";

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
        id: "1",
        source: "assets/images/i1.png",
        x: -6,
        r: -0.6,
        subtitle: "Row One",
        embed: { provider: "youtube", videoId: "mMD63t-W0Os", autoplay: true, muted: true },
        text: "The line begins here — a soft red light spills across the first frame.",
    },
    {
        id: "2",
        source: "assets/images/i2.png",
        x: -3,
        r: -0.2,
        subtitle: "Row Two",
        embed: { provider: "youtube", videoId: "mMD63t-W0Os", autoplay: true, muted: true },
        text: "Each panel leans in slightly, drawing you further along the corridor.",
    },
    {
        id: "3",
        source: "assets/images/i3.png",
        x: 0,
        r: 0,
        subtitle: "Row Three",
        embed: { provider: "vimeo", videoId: "384166760", autoplay: true, muted: true },
        text: "At the center, the spot finds its mark and the image gently breathes.",
    },
    {
        id: "4",
        source: "assets/images/i4.png",
        x: 3,
        r: 0.2,
        subtitle: "Row Four",
        embed: { provider: "youtube", videoId: "mMD63t-W0Os", autoplay: true, muted: true },
        text: "The rhythm holds — quiet float, warm glow, one piece after another.",
    },
    {
        id: "5",
        source: "assets/images/i5.png",
        x: 6,
        r: 0.6,
        subtitle: "Row Five",
        embed: { provider: "youtube", videoId: "mMD63t-W0Os", autoplay: true, muted: true },
        text: "The row ends, but the gallery does not. Step into the drifting collection ahead.",
        nextSceneId: "scene2",
    },
];

export class Scene1 implements GameScene {
    readonly id = "scene1";
    readonly highlightMode: GameScene["highlightMode"] = "selectionOutline";
    private objects: SceneObject[] = [];

    async load(): Promise<void> {
        this.objects = await Promise.all(
            GALLERY_ITEMS.map(async (item, index) => {
                const object = await objectManager.create(item, this.highlightMode);
                objectManager.interactive(object, {
                    onClick: () => {
                        subtitleManager.hide();
                        openGalleryItemModal(item, SCENE1_WINDOW_CONFIGS[index], MODAL_CLASS, this.getMeshes());
                    },
                    onHover: () => item.subtitle && subtitleManager.show(item.subtitle),
                    onHoverEnd: () => subtitleManager.hide(),
                });

                animationManager.add(`scene1-${index}`, object.mesh, {
                    preset: "float",
                    amplitude: 0.15,
                    speed: 1.4,
                    phase: index,
                });
                return object;
            }),
        );

        lightManager.createSpot("scene1Spot", [0, 3.2, 1.5], {
            target: [0, 1.8, 5],
            diffuse: [1, 0.32, 0.32],
            specular: [1, 0.35, 0.35],
            intensity: 1.2,
            range: 14,
            includedOnlyMeshes: this.getMeshes(),
            fixture: { scale: 0.55, color: [1, 0.32, 0.32] },
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
