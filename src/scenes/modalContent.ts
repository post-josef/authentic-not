import { isImageSource } from "../managers/object";
import type { ModalButton, ModalConfig, ModalContentItem } from "../managers/modal";
import { modalManager } from "../managers/modal";
import { sceneManager } from "../managers/scene";
import type { GalleryItem, WindowConfig } from "../types";

export function createGalleryModal(
    item: GalleryItem,
    windowConfig: WindowConfig,
    sceneModalClass?: string,
    options: { onNext?: () => void } = {},
): ModalConfig {
    const buttons: ModalButton[] = [
        {
            label: "Close",
            className: "modal-btn modal-btn-close",
            onClick: () => modalManager.close(),
        },
    ];

    if (item.nextSceneId) {
        const nextSceneId = item.nextSceneId;
        buttons.push({
            label: "Next",
            className: "modal-btn modal-btn-next",
            onClick: () => {
                options.onNext?.();
                modalManager.close(() => sceneManager.switchTo(nextSceneId));
            },
        });
    }

    let media: ModalContentItem | undefined;
    if (item.embed) {
        media = {
            type: "embed",
            provider: item.embed.provider,
            videoId: item.embed.videoId,
            src: item.embed.src,
            autoplay: item.embed.autoplay ?? true,
            muted: item.embed.muted ?? true,
            className: "modal-embed",
        };
    } else if (item.embedSrc) {
        media = { type: "embed", provider: "generic", src: item.embedSrc, className: "modal-embed" };
    } else if (isImageSource(item.source)) {
        media = { type: "image", src: item.source, alt: item.subtitle ?? item.id, className: "modal-image" };
    }

    const title = item.subtitle ?? item.id;

    return {
        pickableMeshes: sceneManager.getMeshes(),
        style: {
            className: sceneModalClass,
            vars: {
                "--modal-color": windowConfig.color,
                "--modal-offset-x": windowConfig.left,
                "--modal-offset-y": windowConfig.top,
            },
        },
        content: [
            { type: "text", content: title, tag: "h2", className: "modal-title" },
            ...(media ? [media] : []),
            ...(item.text ? [{ type: "text" as const, content: item.text, className: "modal-body" }] : []),
            { type: "buttons", className: "modal-actions", buttons },
        ],
    };
}
