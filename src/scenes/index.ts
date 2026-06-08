import type { GameScene } from "./types";
import { Scene1 } from "./scene1";
import { Scene2 } from "./scene2";

export type { GameScene, GalleryItem, WindowConfig, SceneLoadContext } from "./types";
export { Scene1, SCENE1_WINDOW_CONFIGS } from "./scene1";
export { Scene2, SCENE2_WINDOW_CONFIGS } from "./scene2";

export const SCENE_REGISTRY: Record<string, () => GameScene> = {
    scene1: () => new Scene1(),
    scene2: () => new Scene2(),
};

export const DEFAULT_SCENE_ID = "scene1";

export function createScene(id: string): GameScene {
    const factory = SCENE_REGISTRY[id];
    if (!factory) {
        throw new Error(`Unknown scene: ${id}`);
    }
    return factory();
}
