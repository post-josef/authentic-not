import type { SceneManager } from "../managers/scene";
import { Scene1 } from "./demo/scene1";
import { Scene2 } from "./demo/scene2";
import { Scene3 } from "./demo/scene3";
import { Scene4 } from "./demo/scene4";

import { SceneStart } from "./sceneStart";
import { SceneKv } from "./scene-kv";
import { SceneNs } from "./scene-ns";

export function registerScenes(scenes: SceneManager) {
    // demo & testing:
    scenes.register("demo1", () => new Scene1());
    scenes.register("demo2", () => new Scene2());
    scenes.register("demo3", () => new Scene3());
    scenes.register("demo4", () => new Scene4());

    // exhibition:
    scenes.register("start", () => new SceneStart());
    scenes.register("kv", () => new SceneKv());
    scenes.register("ns", () => new SceneNs());
}
