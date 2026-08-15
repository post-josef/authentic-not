import type { AbstractMesh } from "@babylonjs/core";
import { highlightManager } from "../managers/highlight";
import { modalManager } from "../managers/modal";
import type { ModalConfig } from "../modal/types";

export interface SceneObject {
    readonly mesh: AbstractMesh;
    dispose(): void;
}

export function wireInteractive(object: SceneObject, onClick: () => void): void {
    highlightManager.makeInteractive(object.mesh, {
        isInteractionBlocked: () => modalManager.isOpen(),
        onPick: onClick,
    });
}

export function openModal(config: ModalConfig): void {
    modalManager.open(config);
}
