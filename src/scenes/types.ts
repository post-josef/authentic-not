import type { AbstractMesh } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core";

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
    showNextButton?: boolean;
}

export interface SceneLoadContext {
    scene: Scene;
    onItemClick: (index: number, item: GalleryItem) => void;
    isInteractionBlocked: () => boolean;
}

export interface GameScene {
    readonly id: string;
    readonly meshes: AbstractMesh[];
    load(ctx: SceneLoadContext): void;
    unload(): void;
    setMeshesPickable(pickable: boolean): void;
}
