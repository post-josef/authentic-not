import type { AbstractMesh } from "@babylonjs/core";
import type { SceneContext } from "../managers/types";
import type { ModalConfig } from "../modal/types";

export interface SceneObject {
    readonly mesh: AbstractMesh;
    dispose(): void;
}

export interface InteractiveObjectOptions {
    ctx: SceneContext;
    onPick: () => void;
}

export function wireInteractive(object: SceneObject, options: InteractiveObjectOptions): void {
    const { ctx, onPick } = options;
    ctx.highlight.makeInteractive(object.mesh, {
        isInteractionBlocked: ctx.isInteractionBlocked,
        onPick,
    });
}

export function openModal(ctx: SceneContext, config: ModalConfig): void {
    ctx.modal.show(config);
}
