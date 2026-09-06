import type { AbstractMesh } from "@babylonjs/core";

export type HighlightMode = "border" | "highlightLayer" | "glowLayer" | "selectionOutline";
export type EmbedProvider = "youtube" | "vimeo" | "generic";

export interface SceneObject {
    readonly mesh: AbstractMesh;
    dispose(): void;
}

export interface WindowConfig {
    color: string;
    left: string;
    top: string;
}

export interface GalleryItem {
    id: string;
    source: string;
    scale?: number;
    width?: number;
    height?: number;
    x: number;
    y?: number;
    z?: number;
    r?: number;

    highlight?: HighlightMode;
    subtitle?: string;
    text?: string;
    embedSrc?: string;
    embed?: {
        provider: EmbedProvider;
        videoId?: string;
        src?: string;
        autoplay?: boolean;
        muted?: boolean;
    };
    nextSceneId?: string;
}

export interface GameScene {
    readonly id: string;
    readonly highlightMode: HighlightMode;
    load(): Promise<void>;
    unload(): void;
    getMeshes(): AbstractMesh[];
}
