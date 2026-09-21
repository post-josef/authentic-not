import type { AbstractMesh } from "@babylonjs/core";

export type HighlightMode = "border" | "highlightLayer" | "glow" | "outline";

export type ModalButtonAction = "close" | { scene: string };
export type ModalContentButton = { label: string; action: ModalButtonAction };
export type ModalContent =
    | { type: "text"; content: string; tag?: "p" | "h1" | "h2" | "h3" | "div" }
    | { type: "image"; src: string; width?: number; height?: number; alt?: string }
    | { type: "video"; src: string }
    | { type: "embed"; source: string }
    | { type: "buttons"; buttons: ModalContentButton[] }
    | { type: "spacer"; height?: string }
    | { type: "divider" };

export interface Object3D {
    id: string;
    source: string;
    x: number;
    y: number;
    z: number;
    rx?: number;
    ry?: number;
    rz?: number;
    scale?: number;
    width?: number;
    height?: number;
    subtitle?: string;
    highlight?: HighlightMode;
    modalClassName?: string;
    modal?: ModalContent[];
}

export interface SceneObject {
    readonly mesh: AbstractMesh;
    dispose(): void;
}

export interface Scene {
    load(): Promise<void>;
    unload(): void;
    getMeshes(): AbstractMesh[];
}
