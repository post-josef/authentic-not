import type { AbstractMesh } from "@babylonjs/core";
import type { HighlightMode } from "../managers/highlight";
import type { EmbedProvider } from "../modal/embeds";

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
    load(): void;
    unload(): void;
    getMeshes(): AbstractMesh[];
}
