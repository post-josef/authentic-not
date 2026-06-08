import {
    Engine,
    Scene,
    UniversalCamera,
    Vector3,
    HemisphericLight,
    Color4,
} from "@babylonjs/core";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { ModalManager } from "./modal";
import {
    createScene,
    DEFAULT_SCENE_ID,
    SCENE1_WINDOW_CONFIGS,
    SCENE2_WINDOW_CONFIGS,
    type GameScene,
    type GalleryItem,
} from "./scenes";

export class App {
    engine: Engine | null = null;
    scene: Scene | null = null;

    private camera: UniversalCamera | null = null;
    private ui: AdvancedDynamicTexture | null = null;
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

        this.camera = new UniversalCamera("cam", new Vector3(0, 1.7, -10), this.scene);
        this.camera.attachControl(canvas, true);

        new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);

        this.ui = AdvancedDynamicTexture.CreateFullscreenUI("ui");
        this.modal = new ModalManager(
            this.ui,
            () => this.camera?.detachControl(),
            () => this.camera?.attachControl(canvas, true),
        );

        this.switchScene(DEFAULT_SCENE_ID);

        this.engine.runRenderLoop(() => {
            this.scene?.render();
            this.updateFps();
        });
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

        const windowConfigs =
            this.currentScene.id === "scene2" ? SCENE2_WINDOW_CONFIGS : SCENE1_WINDOW_CONFIGS;

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
        const fpsElement = document.getElementById("fps");
        if (fpsElement && this.engine) {
            fpsElement.textContent = `FPS: ${Math.round(this.engine.getFps())}`;
        }
    }
}
