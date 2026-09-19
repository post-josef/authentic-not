import type { SceneManager } from "../managers/scene";
import { SceneStart } from "./sceneStart";
import { SceneKv } from "./scene-kv";
import { SceneNs } from "./scene-ns";

export function registerScenes(scenes: SceneManager): void {
    scenes.register("start", () => new SceneStart());
    scenes.register("kv", () => new SceneKv());
    scenes.register("ns", () => new SceneNs());
}
