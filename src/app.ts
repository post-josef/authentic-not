import { Engine, Scene, Color4 } from "@babylonjs/core";
import { CameraManager } from "./managers/camera";
import { HighlightManager } from "./managers/highlight";
import { LightManager } from "./managers/light";
import { ModalManager } from "./managers/modal";
import { SceneManager } from "./managers/scene";
import type { SceneContext } from "./managers/types";
import { DEFAULT_SCENE_ID, registerScenes } from "./scenes";

export class App {
    engine: Engine | null = null;
    scene: Scene | null = null;

    init(): void {
        const canvas = document.getElementById("canvas");
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error("Canvas element not found");
        }

        this.engine = new Engine(canvas, true, { stencil: true });
        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0.05, 0.05, 0.08, 1);

        const highlight = new HighlightManager(this.scene);
        const light = new LightManager(this.scene);

        const ctx: SceneContext = {
            babylonScene: this.scene,
            camera: null!,
            highlight,
            light,
            modal: null!,
            scenes: null!,
            isInteractionBlocked: () => ctx.modal.isOpen(),
        };

        const camera = new CameraManager(this.scene, canvas, {
            isInteractionBlocked: () => ctx.modal.isOpen(),
        });
        ctx.camera = camera;

        const scenes = new SceneManager(ctx);
        const modal = new ModalManager({ camera, highlight, scenes });

        ctx.modal = modal;
        ctx.scenes = scenes;

        registerScenes(scenes);
        scenes.switchTo(DEFAULT_SCENE_ID);

        this.engine.runRenderLoop(() => {
            this.scene?.render();
            if (process.env.NODE_ENV === "development") this.updateFps();
        });
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
