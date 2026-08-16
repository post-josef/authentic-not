import type { AbstractMesh } from "@babylonjs/core";
import { highlightManager } from "../managers/highlight";
import { modalManager } from "../managers/modal";
import type { ModalConfig } from "../modal/types";

export interface SceneObject {
    readonly mesh: AbstractMesh;
    dispose(): void;
}

interface InteractiveOptions {
    onHover?: () => void;
    onHoverEnd?: () => void;
}

export function wireInteractive(
    object: SceneObject,
    onClick: () => void,
    options: InteractiveOptions = {},
): void {
    highlightManager.makeInteractive(object.mesh, {
        isInteractionBlocked: () => modalManager.isOpen(),
        onPick: onClick,
        onPointerOver: options.onHover,
        onPointerOut: options.onHoverEnd,
    });
}

export function openModal(config: ModalConfig): void {
    modalManager.open(config);
}
