import type { Scene as BabylonScene } from "@babylonjs/core";
import type { Scene } from "../types";
import { modalManager } from "./modal";
import { animationManager } from "./animation";
import { audioManager } from "./audio";
import { backgroundManager } from "./background";
import { cameraManager } from "./camera";
import { fogManager } from "./fog";
import { highlightManager } from "./highlight";
import { lightManager } from "./light";
import { subtitleManager } from "./subtitle";

export class SceneManager {
    private babylonScene: BabylonScene | null = null;
    private registry = new Map<string, () => Scene>();
    private current: Scene | null = null;
    private routeId: string | null = null;
    private history: string[] = [];
    private navigatingBack = false;

    init(scene: BabylonScene) {
        this.babylonScene = scene;
    }

    register(id: string, factory: () => Scene) {
        this.registry.set(id, factory);
    }

    switchTo(id: string, skipHash = false) {
        if (!this.registry.has(id)) throw new Error(`Unknown scene: ${id}`);
        const go = () => {
            if (this.routeId === id) {
                if (!skipHash && location.hash !== `#/${id}`) location.hash = `#/${id}`;
                return;
            }
            this.performSwitch(id);
            if (!skipHash && location.hash !== `#/${id}`) location.hash = `#/${id}`;
        };
        if (modalManager.isOpen()) modalManager.close(go);
        else go();
    }

    goBack() {
        const go = () => {
            const previous = this.history.pop();
            if (previous) {
                this.navigatingBack = true;
                try {
                    this.switchTo(previous);
                } finally {
                    this.navigatingBack = false;
                }
                return;
            }
            if (location.hash) location.hash = "";
        };
        if (modalManager.isOpen()) modalManager.close(go);
        else go();
    }

    sceneIdFromHash(): string | null {
        const match = location.hash.match(/^#\/([^/?#]+)/);
        return match?.[1] ?? null;
    }

    getRouteId(): string | null {
        return this.routeId;
    }

    getBabylonScene(): BabylonScene {
        if (!this.babylonScene) throw new Error("sceneManager.init(scene) must be called first");
        return this.babylonScene;
    }

    dispose() {
        this.clearSceneResources();
        this.current = null;
        this.routeId = null;
        this.history = [];
        this.navigatingBack = false;
        this.registry.clear();
        this.babylonScene = null;
    }

    clearLoading() {
        document.getElementById("scene-loader")?.remove();
        document.getElementById("scene-boot")?.remove();
    }

    private performSwitch(id: string) {
        const factory = this.registry.get(id);
        if (!factory) throw new Error(`Unknown scene: ${id}`);
        if (!this.navigatingBack && this.routeId && this.routeId !== id) {
            this.history.push(this.routeId);
        }
        this.clearSceneResources();
        this.current = factory();
        this.routeId = id;
        void this.current
            .load()
            .catch((error) => console.error(`[sceneManager] Failed to load ${id}`, error))
            .finally(() => this.clearLoading());
    }

    private clearSceneResources() {
        highlightManager.clear();
        subtitleManager.clear();
        audioManager.clear();
        animationManager.clear();
        backgroundManager.clear();
        fogManager.clear();
        lightManager.clear();

        const scene = this.babylonScene;
        if (scene) {
            for (const mesh of [...scene.meshes]) {
                if (mesh.isDisposed()) continue;
                const release = mesh.metadata?.exhibitDispose as (() => void) | undefined;
                if (release) release();
                else mesh.dispose(false, true);
            }
        }

        cameraManager.resetSceneConfig();
    }
}

export const sceneManager = new SceneManager();
