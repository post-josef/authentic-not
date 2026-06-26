import type { Scene } from "@babylonjs/core";
import type { CameraManager } from "./camera";
import type { HighlightManager } from "./highlight";
import type { LightManager } from "./light";
import type { ModalManager } from "./modal";
import type { SceneManager } from "./scene";

export interface ManagerBundle {
    camera: CameraManager;
    highlight: HighlightManager;
    light: LightManager;
    modal: ModalManager;
    scenes: SceneManager;
}

export interface SceneContext {
    babylonScene: Scene;
    camera: CameraManager;
    highlight: HighlightManager;
    light: LightManager;
    modal: ModalManager;
    scenes: SceneManager;
    isInteractionBlocked: () => boolean;
}
