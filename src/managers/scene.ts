import type { AbstractMesh, Scene } from "@babylonjs/core";
import type { GalleryItem, GameScene, WindowConfig } from "../types";
import { modalManager, type ModalButton, type ModalContentItem } from "./modal";
import { animationManager } from "./animation";
import { audioManager } from "./audio";
import { backgroundManager } from "./background";
import { cameraManager } from "./camera";
import { fogManager } from "./fog";
import { highlightManager } from "./highlight";
import { lightManager } from "./light";
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

    switchTo(id: string, skipHash = false): void {
        if (!this.registry.has(id)) throw new Error(`Unknown scene: ${id}`);
        if (this.switching) return;
        const finish = () => {
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
        next.load().catch((error) => console.error(`[sceneManager] Failed to load ${id}`, error));
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

function isImageSource(source: string): boolean {
    return /\.(png|jpe?g|gif|webp)$/i.test(source.split(/[?#]/, 1)[0]);
}

export function openGalleryItemModal(
    item: GalleryItem,
    windowConfig: WindowConfig,
    modalClass: string,
    meshes: AbstractMesh[],
    options: { onNext?: () => void } = {},
): void {
    const buttons: ModalButton[] = [
        {
            label: "Close",
            className: "modal-btn modal-btn-close",
            onClick: () => modalManager.close(),
        },
    ];
    if (item.nextSceneId) {
        const nextSceneId = item.nextSceneId;
        buttons.push({
            label: "Next",
            className: "modal-btn modal-btn-next",
            onClick: () => {
                options.onNext?.();
                modalManager.close(() => sceneManager.switchTo(nextSceneId));
            },
        });
    }

    let media: ModalContentItem | undefined;
    if (item.embed) {
        media = {
            type: "embed",
            provider: item.embed.provider,
            videoId: item.embed.videoId,
            src: item.embed.src,
            autoplay: item.embed.autoplay ?? true,
            muted: item.embed.muted ?? true,
            className: "modal-embed",
        };
    } else if (item.embedSrc) {
        media = { type: "embed", provider: "generic", src: item.embedSrc, className: "modal-embed" };
    } else if (isImageSource(item.source)) {
        media = {
            type: "image",
            src: item.source,
            alt: item.subtitle ?? item.id,
            className: "modal-image",
        };
    }

    modalManager.open({
        pickableMeshes: meshes,
        style: {
            className: modalClass,
            vars: {
                "--modal-color": windowConfig.color,
                "--modal-offset-x": windowConfig.left,
                "--modal-offset-y": windowConfig.top,
            },
        },
        content: [
            { type: "text", content: item.subtitle ?? item.id, tag: "h2", className: "modal-title" },
            ...(media ? [media] : []),
            ...(item.text ? [{ type: "text" as const, content: item.text, className: "modal-body" }] : []),
            { type: "buttons", className: "modal-actions", buttons },
        ],
    });
}
