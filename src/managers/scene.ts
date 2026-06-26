import type { AbstractMesh } from "@babylonjs/core";
import type { GameScene } from "../scenes/types";
import type { SceneContext } from "./types";

export class SceneManager {
    private readonly ctx: SceneContext;
    private readonly registry = new Map<string, () => GameScene>();
    private current: GameScene | null = null;

    constructor(ctx: SceneContext) {
        this.ctx = ctx;
    }

    register(id: string, factory: () => GameScene): void {
        this.registry.set(id, factory);
    }

    switchTo(id: string): void {
        const factory = this.registry.get(id);
        if (!factory) throw new Error(`Unknown scene: ${id}`);

        this.current?.unload();
        this.ctx.highlight.clear();
        this.ctx.light.clear();
        this.ctx.camera.reset(true);

        this.current = factory();
        this.ctx.highlight.setMode(this.current.highlightMode);
        this.current.load(this.ctx);
    }

    getCurrent(): GameScene | null {
        return this.current;
    }

    getMeshes(): AbstractMesh[] {
        return this.current?.getMeshes() ?? [];
    }

    setMeshesPickable(pickable: boolean): void {
        this.current?.setMeshesPickable(pickable);
    }
}
