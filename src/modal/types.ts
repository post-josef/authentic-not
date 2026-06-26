import type { AbstractMesh } from "@babylonjs/core";
import type { ModalManager } from "../managers/modal";
import type { SceneManager } from "../managers/scene";

export interface ModalActionContext {
    modal: ModalManager;
    scenes: SceneManager;
}

export type ModalAction = (ctx: ModalActionContext) => void;

export interface ModalButton {
    label: string;
    action: ModalAction;
    className?: string;
}

export type ModalBlock =
    | { type: "text"; content: string; className?: string }
    | { type: "image"; src: string; alt?: string; className?: string }
    | { type: "video"; src: string; className?: string }
    | { type: "embed"; src: string; className?: string }
    | { type: "buttons"; className?: string; buttons: ModalButton[] };

export interface ModalStyle {
    className?: string;
    vars?: Record<string, string>;
}

export interface ModalConfig {
    style?: ModalStyle;
    blocks: ModalBlock[];
    pickableMeshes?: AbstractMesh[];
}
