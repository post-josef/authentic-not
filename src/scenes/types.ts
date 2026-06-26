import type { AbstractMesh } from "@babylonjs/core";
import type { HighlightMode } from "../managers/highlight";
import type { SceneContext } from "../managers/types";

export interface WindowConfig {
    color: string;
    left: string;
    top: string;
}

export interface GalleryItem {
    title: string;
    img: string;
    x: number;
    y?: number;
    z?: number;
    r: number;
    text: string;
    nextSceneId?: string;
}

export interface GameScene {
    readonly id: string;
    readonly highlightMode: HighlightMode;
    load(ctx: SceneContext): void;
    unload(): void;
    getMeshes(): AbstractMesh[];
    setMeshesPickable(pickable: boolean): void;
}
