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
    source: string; // mesh source file (GLB, image or video)
    x: number;
    y: number;
    z: number;
    rx?: number;
    ry?: number;
    rz?: number;
    scale?: number; // mesh scale on all axes
    width?: number; // image/video width
    height?: number; // image/video height
    subtitle?: string;
    highlight?: HighlightMode;
    modalClassName?: string;
    modal?: ModalContent[];
    targetScene?: string; // onClick scene switch
}

export interface Scene {
    load(): Promise<void>;
}
