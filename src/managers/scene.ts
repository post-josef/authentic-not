import type { AbstractMesh, Scene } from "@babylonjs/core";
import type { GameScene } from "../scenes/types";
import { animationManager } from "./animation";
import { audioManager } from "./audio";
import { backgroundManager } from "./background";
import { cameraManager } from "./camera";
import { fogManager } from "./fog";
import { highlightManager } from "./highlight";
import { lightManager } from "./light";
import { modalManager } from "./modal";
import { subtitleManager } from "./subtitle";

export class SceneManager {
    private babylonScene: Scene | null = null;
    private registry = new Map<string, () => GameScene>();
    private current: GameScene | null = null;
    private switching = false;

    init(scene: Scene): void {
        this.babylonScene = scene;
    }

    register(id: string, factory: () => GameScene): void {
        this.registry.set(id, factory);
    }

    switchTo(id: string): void {
        if (!this.registry.has(id)) throw new Error(`Unknown scene: ${id}`);
        if (this.switching) return;
        if (modalManager.isOpen()) {
            this.switching = true;
            modalManager.close(() => {
                this.switching = false;
                this.performSwitch(id);
            });
            return;
        }
        this.performSwitch(id);
    }

    getCurrent(): GameScene | null {
        return this.current;
    }

    getBabylonScene(): Scene {
        if (!this.babylonScene) throw new Error("sceneManager.init(scene) must be called first");
        return this.babylonScene;
    }

    getMeshes(): AbstractMesh[] {
        return this.current?.getMeshes() ?? [];
    }

    dispose(): void {
        this.clearSceneResources();
        this.current?.unload();
        this.current = null;
        this.registry.clear();
        this.babylonScene = null;
    }

    private performSwitch(id: string): void {
        const factory = this.registry.get(id);
        if (!factory) throw new Error(`Unknown scene: ${id}`);
        this.clearSceneResources();
        this.current?.unload();
        this.current = null;

        const next = factory();
        this.current = next;
        highlightManager.setMode(next.highlightMode);
        next.load();
    }

    private clearSceneResources(): void {
        const cleanups: Array<[string, () => void]> = [
            ["highlight", () => highlightManager.clear()],
            ["subtitles", () => subtitleManager.clear()],
            ["audio", () => audioManager.clear()],
            ["animations", () => animationManager.clear()],
            ["background", () => backgroundManager.clear()],
            ["fog", () => fogManager.clear()],
            ["lights", () => lightManager.clear()],
            ["camera", () => cameraManager.resetSceneConfig()],
        ];
        cleanups.forEach(([name, cleanup]) => {
            try {
                cleanup();
            } catch (error) {
                console.error(`[sceneManager] Failed to clear ${name}`, error);
            }
        });
    }
}

export const sceneManager = new SceneManager();
