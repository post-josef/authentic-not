import type { AbstractMesh, Scene as BabylonScene } from "@babylonjs/core";
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
    private switching = false;

    init(scene: BabylonScene): void {
        this.babylonScene = scene;
    }

    register(id: string, factory: () => Scene): void {
        this.registry.set(id, factory);
    }

    switchTo(id: string, skipHash = false): void {
        if (!this.registry.has(id)) throw new Error(`Unknown scene: ${id}`);
        if (this.switching) return;
        const finish = () => {
            if (this.routeId === id) {
                if (!skipHash) {
                    const hash = `#/${id}`;
                    if (location.hash !== hash) location.hash = hash;
                }
                return;
            }
            this.performSwitch(id);
            if (!skipHash) {
                const hash = `#/${id}`;
                if (location.hash !== hash) location.hash = hash;
            }
        };
        if (modalManager.isOpen()) {
            this.switching = true;
            modalManager.close(() => {
                this.switching = false;
                finish();
            });
            return;
        }
        finish();
    }

    sceneIdFromHash(): string | null {
        const match = location.hash.match(/^#\/([^/?#]+)/);
        return match?.[1] ?? null;
    }

    getCurrent(): Scene | null {
        return this.current;
    }

    getRouteId(): string | null {
        return this.routeId;
    }

    getBabylonScene(): BabylonScene {
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
        this.routeId = null;
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
        this.routeId = id;
        void next
            .load()
            .then(() => {
                if (this.current !== next) next.unload();
            })
            .catch((error) => {
                if (this.current !== next) {
                    next.unload();
                    return;
                }
                console.error(`[sceneManager] Failed to load ${id}`, error);
            });
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
