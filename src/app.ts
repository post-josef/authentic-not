import {
    Engine,
    Scene,
    UniversalCamera,
    Vector3,
    HemisphericLight,
    Color3,
    Color4,
    FreeCameraKeyboardMoveInput,
} from "@babylonjs/core";
import { ModalManager } from "./modal";
import { createScene, DEFAULT_SCENE_ID, SCENE1_WINDOW_CONFIGS, SCENE2_WINDOW_CONFIGS } from "./scenes";

import type { GameScene, GalleryItem } from "./scenes/types";

export class App {
    engine: Engine | null = null;
    scene: Scene | null = null;

    private camera: UniversalCamera | null = null;
    private modal: ModalManager | null = null;
    private currentScene: GameScene | null = null;

    init(): void {
        const canvas = document.getElementById("canvas");
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error("Canvas element not found");
        }

        this.engine = new Engine(canvas, true);
        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0.05, 0.05, 0.08, 1);

        this.camera = this.createWalkCamera(canvas);
        this.setupGlobalLight();

        this.modal = new ModalManager(
            () => this.camera?.detachControl(),
            () => this.camera?.attachControl(canvas, true),
        );

        this.switchScene(DEFAULT_SCENE_ID);

        this.engine.runRenderLoop(() => {
            this.scene?.render();
            if (process.env.NODE_ENV === "development") this.updateFps();
        });
    }

    private setupGlobalLight(): void {
        const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), this.scene!);
        hemi.intensity = 0.1;
        hemi.diffuse = new Color3(0.45, 0.48, 0.55);
        hemi.groundColor = new Color3(0.06, 0.06, 0.08);
    }

    private createWalkCamera(canvas: HTMLCanvasElement): UniversalCamera {
        const WALK_HEIGHT = 1.7;
        const camera = new UniversalCamera("cam", new Vector3(0, WALK_HEIGHT, -10), this.scene!);
        camera.speed = 0.2;
        camera.inputs.removeByType("FreeCameraKeyboardMoveInput");
        const keyboard = new FreeCameraKeyboardMoveInput();
        keyboard.keysUp = [38, 87];
        keyboard.keysDown = [40, 83];
        keyboard.keysLeft = [37, 65];
        keyboard.keysRight = [39, 68];
        keyboard.keysUpward = [];
        keyboard.keysDownward = [];
        camera.inputs.add(keyboard);
        camera.attachControl(canvas, true);

        this.scene!.onBeforeRenderObservable.add(() => {
            camera.position.y = WALK_HEIGHT;
        });
        return camera;
    }

    switchScene(sceneId: string): void {
        if (!this.scene) return;

        this.currentScene?.unload();

        const nextScene = createScene(sceneId);
        nextScene.load({
            scene: this.scene,
            onItemClick: (index, item) => this.onGalleryItemClick(index, item),
            isInteractionBlocked: () => this.modal?.isOpen() ?? false,
        });

        this.currentScene = nextScene;
    }

    private onGalleryItemClick(index: number, item: GalleryItem): void {
        if (!this.modal || !this.currentScene) return;

        const windowConfigs = this.currentScene.id === "scene2" ? SCENE2_WINDOW_CONFIGS : SCENE1_WINDOW_CONFIGS;

        this.modal.show({
            index,
            item,
            windowConfig: windowConfigs[index % windowConfigs.length],
            meshes: this.currentScene.meshes,
            onClose: () => {},
            onNext: item.showNextButton ? () => this.onSceneNext() : undefined,
        });
    }

    private onSceneNext(): void {
        if (!this.currentScene) return;

        const nextId = this.currentScene.id === "scene1" ? "scene2" : "scene1";
        this.switchScene(nextId);
    }

    private updateFps(): void {
        let fpsElement = document.getElementById("fps");
        if (!fpsElement) {
            fpsElement = document.createElement("div");
            fpsElement.id = "fps";
            document.body.appendChild(fpsElement);
        }
        if (fpsElement && this.engine) {
            fpsElement.textContent = `FPS: ${Math.round(this.engine.getFps())}`;
        }
    }
}
