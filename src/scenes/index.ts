import type { SceneManager } from "../managers/scene";
import { Scene1 } from "./demo/scene1";
import { Scene2 } from "./demo/scene2";
import { Scene3 } from "./demo/scene3";
import { Scene4 } from "./demo/scene4";

import { SceneStart } from "./sceneStart";
import { SceneMM } from "./scene-mm";
import { SceneNS } from "./scene-ns";
import { SceneKV } from "./scene-kv";
import { SceneKZ } from "./scene-kz";
import { SceneJV } from "./scene-jv";

export function registerScenes(scenes: SceneManager) {
    // demo & testing:
    scenes.register("scene1", () => new Scene1());
    scenes.register("scene2", () => new Scene2());
    scenes.register("scene3", () => new Scene3());
    scenes.register("scene4", () => new Scene4());

    // exhibition:
    scenes.register("start", () => new SceneStart());
    scenes.register("kv", () => new SceneKV());
    scenes.register("ns", () => new SceneNS());
    scenes.register("mm", () => new SceneMM());
    scenes.register("kz", () => new SceneKZ());
    scenes.register("jv", () => new SceneJV());
}
