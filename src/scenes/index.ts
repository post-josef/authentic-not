import { Scene1 } from "./scene1";
import { Scene2 } from "./scene2";
import { Scene3 } from "./scene3";
import { Scene4 } from "./scene4";

export type { GameScene, GalleryItem, WindowConfig } from "./types";
export { Scene1, SCENE1_WINDOW_CONFIGS } from "./scene1";
export { Scene2, SCENE2_WINDOW_CONFIGS } from "./scene2";
export { Scene3, SCENE3_WINDOW_CONFIGS } from "./scene3";
export { Scene4, SCENE4_WINDOW_CONFIGS } from "./scene4";

export const DEFAULT_SCENE_ID = "scene1";

export function registerScenes(scenes: import("../managers/scene").SceneManager): void {
    scenes.register("scene1", () => new Scene1());
    scenes.register("scene2", () => new Scene2());
    scenes.register("scene3", () => new Scene3());
    scenes.register("scene4", () => new Scene4());
}
