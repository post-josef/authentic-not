import { Color4, Engine, Scene } from "@babylonjs/core";
import { animationManager } from "./managers/animation";
import { audioManager } from "./managers/audio";
import { backgroundManager } from "./managers/background";
import { cameraManager } from "./managers/camera";
import { fogManager } from "./managers/fog";
import { highlightManager } from "./managers/highlight";
import { lightManager } from "./managers/light";
import { modalManager } from "./managers/modal";
import { sceneManager } from "./managers/scene";
import { subtitleManager } from "./managers/subtitle";
import { registerScenes } from "./scenes";

export class App {
    engine: Engine | null = null;
    scene: Scene | null = null;
    private unlockAudioHandler: (() => void) | null = null;
    private fpsElement: HTMLElement | null = null;
    private resizeObserver: ResizeObserver | null = null;

    init(): void {
        const canvas = document.getElementById("canvas");
        if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Canvas element not found");

        this.engine = new Engine(canvas, true, { stencil: true, audioEngine: true });
        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0.05, 0.05, 0.08, 1);

        highlightManager.init(this.scene);
        lightManager.init(this.scene);
        backgroundManager.init(this.scene);
        animationManager.init(this.scene);
        fogManager.init(this.scene);
        subtitleManager.init();
        sceneManager.init(this.scene);
        modalManager.init();
        audioManager.init(this.scene);
        cameraManager.init(this.scene, canvas);

        // CSS can load after JS on refresh; resize when the canvas actually has a size
        this.resizeObserver = new ResizeObserver(() => {
            if (canvas.clientWidth && canvas.clientHeight) this.engine?.resize();
        });
        this.resizeObserver.observe(canvas);

        this.unlockAudioHandler = () => {
            audioManager.unlock();
            this.removeAudioUnlockListeners();
        };
        window.addEventListener("pointerdown", this.unlockAudioHandler);
        window.addEventListener("keydown", this.unlockAudioHandler);

        registerScenes(sceneManager);
        this.engine.runRenderLoop(() => {
            this.scene?.render();
            if (process.env.NODE_ENV === "development") this.updateFps();
        });
    }

    resize(): void {
        this.engine?.resize();
    }

    dispose(): void {
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        this.removeAudioUnlockListeners();
        this.engine?.stopRenderLoop();
        modalManager.dispose();
        sceneManager.dispose();
        audioManager.dispose();
        subtitleManager.dispose();
        fogManager.dispose();
        animationManager.dispose();
        backgroundManager.dispose();
        lightManager.dispose();
        highlightManager.dispose();
        cameraManager.dispose();
        this.scene?.dispose();
        this.engine?.dispose();
        this.fpsElement?.remove();
        this.fpsElement = null;
        this.scene = null;
        this.engine = null;
    }

    private removeAudioUnlockListeners(): void {
        if (!this.unlockAudioHandler) return;
        window.removeEventListener("pointerdown", this.unlockAudioHandler);
        window.removeEventListener("keydown", this.unlockAudioHandler);
        this.unlockAudioHandler = null;
    }

    private updateFps(): void {
        if (!this.fpsElement) {
            this.fpsElement = document.createElement("div");
            this.fpsElement.id = "fps";
            document.body.appendChild(this.fpsElement);
        }
        if (this.engine) {
            this.fpsElement.textContent = `FPS: ${Math.round(this.engine.getFps())}`;
        }
    }
}
