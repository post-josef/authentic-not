import type { AbstractMesh } from "@babylonjs/core";
import type { EmbedProvider } from "./embeds";

export type ModalCallback = () => void | Promise<void>;
export type ModalItemStyle = Record<string, string>;

interface ModalItemBase {
    id?: string;
    className?: string;
    style?: ModalItemStyle;
}

export type ModalContentItem =
    | (ModalItemBase & {
          type: "text";
          content: string;
          tag?: "p" | "h1" | "h2" | "h3" | "div";
      })
    | (ModalItemBase & { type: "image"; src: string; alt?: string })
    | (ModalItemBase & {
          type: "video";
          src: string;
          poster?: string;
          controls?: boolean;
          autoplay?: boolean;
          muted?: boolean;
          loop?: boolean;
      })
    | (ModalItemBase & {
          type: "embed";
          provider?: EmbedProvider;
          videoId?: string;
          src?: string;
          autoplay?: boolean;
          muted?: boolean;
          params?: Record<string, string>;
      })
    | (ModalItemBase & { type: "button"; label: string; onClick: ModalCallback })
    | (ModalItemBase & { type: "buttons"; buttons: ModalButton[] })
    | (ModalItemBase & { type: "spacer"; height?: string })
    | (ModalItemBase & { type: "divider" });

export interface ModalButton {
    label: string;
    className?: string;
    style?: ModalItemStyle;
    onClick: ModalCallback;
}

export interface ModalConfig {
    style?: {
        className?: string;
        vars?: Record<string, string>;
        width?: string;
        maxHeight?: string;
    };
    content: ModalContentItem[];
    dismissOnBackdrop?: boolean;
    pickableMeshes?: AbstractMesh[];
}
