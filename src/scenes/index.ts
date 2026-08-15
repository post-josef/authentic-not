import type { SceneManager } from "../managers/scene";
import { Scene1 } from "./scene1";
import { Scene2 } from "./scene2";
import { Scene3 } from "./scene3";
import { Scene4 } from "./scene4";

export const DEFAULT_SCENE_ID = "scene1";

export function registerScenes(scenes: SceneManager): void {
    scenes.register("scene1", () => new Scene1());
    scenes.register("scene2", () => new Scene2());
    scenes.register("scene3", () => new Scene3());
    scenes.register("scene4", () => new Scene4());
}
