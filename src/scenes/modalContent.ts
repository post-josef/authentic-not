import type { ModalActionContext, ModalButton, ModalConfig } from "../modal/types";
import type { GalleryItem, WindowConfig } from "./types";

export function createGalleryModal(
    item: GalleryItem,
    windowConfig: WindowConfig,
    sceneModalClass?: string,
): ModalConfig {
    const buttons: ModalButton[] = [
        {
            label: "Close",
            className: "modal-btn modal-btn-close",
            action: (ctx: ModalActionContext) => ctx.modal.close(),
        },
    ];

    if (item.nextSceneId) {
        const nextId = item.nextSceneId;
        buttons.push({
            label: "Next",
            className: "modal-btn modal-btn-next",
            action: (ctx: ModalActionContext) =>
                ctx.modal.close(() => ctx.scenes.switchTo(nextId)),
        });
    }

    return {
        style: {
            className: sceneModalClass,
            vars: {
                "--modal-color": windowConfig.color,
                "--modal-offset-x": windowConfig.left,
                "--modal-offset-y": windowConfig.top,
            },
        },
        blocks: [
            { type: "text", content: item.title, className: "modal-title" },
            { type: "image", src: item.img, alt: item.title, className: "modal-image" },
            { type: "text", content: item.text, className: "modal-body" },
            { type: "buttons", className: "modal-actions", buttons },
        ],
    };
}
