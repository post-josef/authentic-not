import { AdvancedDynamicTexture, Rectangle, StackPanel, TextBlock, Button, Control } from "@babylonjs/gui";
import { createFixedHeightImage, fadeControl, setPlaneHighlight } from "./utils";
import type { AbstractMesh } from "@babylonjs/core";
import type { GalleryItem, WindowConfig } from "./scenes/types";

export interface ModalOptions {
    index: number;
    item: GalleryItem;
    windowConfig: WindowConfig;
    meshes: AbstractMesh[];
    onClose: () => void;
    onNext?: () => void;
}

export class ModalManager {
    private ui: AdvancedDynamicTexture;
    private detachCamera: () => void;
    private attachCamera: () => void;

    private open = false;
    private controls: Control[] = [];

    constructor(ui: AdvancedDynamicTexture, detachCamera: () => void, attachCamera: () => void) {
        this.ui = ui;
        this.detachCamera = detachCamera;
        this.attachCamera = attachCamera;
    }

    isOpen(): boolean {
        return this.open;
    }

    show(options: ModalOptions): void {
        if (this.open) return;

        this.open = true;
        this.clearHighlights(options.meshes);
        options.meshes.forEach((m) => (m.isPickable = false));
        this.detachCamera();

        const backdrop = new Rectangle("backdrop");
        backdrop.width = 1;
        backdrop.height = 1;
        backdrop.thickness = 0;
        backdrop.background = "black";
        backdrop.alpha = 0;
        backdrop.isPointerBlocker = true;
        this.ui.addControl(backdrop);

        const config = options.windowConfig;
        const panel = new Rectangle("panel");
        panel.width = "560px";
        panel.height = "420px";
        panel.cornerRadius = 8;
        panel.thickness = 2;
        panel.color = "white";
        panel.background = config.color;
        panel.left = config.left;
        panel.top = config.top;
        panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        panel.alpha = 0;
        panel.isPointerBlocker = true;
        this.ui.addControl(panel);

        this.controls = [backdrop, panel];

        const stack = new StackPanel();
        panel.addControl(stack);

        const titleBlock = new TextBlock();
        titleBlock.text = options.item.title;
        titleBlock.height = "50px";
        titleBlock.color = "white";
        titleBlock.fontSize = 28;
        stack.addControl(titleBlock);

        stack.addControl(createFixedHeightImage(options.item.img, 200));

        const body = new TextBlock();
        body.text = options.item.text;
        body.height = "90px";
        body.color = "white";
        body.textWrapping = true;
        stack.addControl(body);

        const buttonRow = new StackPanel();
        buttonRow.isVertical = false;
        buttonRow.height = "44px";
        buttonRow.spacing = 16;
        buttonRow.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;

        const closeBtn = Button.CreateSimpleButton("close", "Close");
        closeBtn.width = "150px";
        closeBtn.height = "44px";
        closeBtn.background = "#333";
        closeBtn.color = "white";
        closeBtn.hoverCursor = "pointer";
        closeBtn.isPointerBlocker = true;
        closeBtn.onPointerClickObservable.add(() => this.close(options.meshes, options.onClose));
        buttonRow.addControl(closeBtn);

        if (options.item.showNextButton && options.onNext) {
            const nextBtn = Button.CreateSimpleButton("next", "Next");
            nextBtn.width = "150px";
            nextBtn.height = "44px";
            nextBtn.background = "#1a6b3c";
            nextBtn.color = "white";
            nextBtn.hoverCursor = "pointer";
            nextBtn.isPointerBlocker = true;
            nextBtn.onPointerClickObservable.add(() => {
                this.close(options.meshes, () => {
                    options.onClose();
                    options.onNext!();
                });
            });
            buttonRow.addControl(nextBtn);
        }

        stack.addControl(buttonRow);

        fadeControl(backdrop, 0, 0.55, 120);
        fadeControl(panel, 0, 1, 120);
        this.bindBackdropDismiss(backdrop, options.meshes, options.onClose);
    }

    private close(meshes: AbstractMesh[], onClosed?: () => void): void {
        if (!this.open) return;

        const controls = this.controls;
        this.open = false;
        this.controls = [];

        let remaining = controls.length;
        const onFaded = (): void => {
            remaining -= 1;
            if (remaining === 0) {
                controls.forEach((c) => c.dispose());
                meshes.forEach((m) => (m.isPickable = true));
                this.attachCamera();
                onClosed?.();
            }
        };

        for (const control of controls) {
            fadeControl(control, control.alpha, 0, 180, onFaded);
        }
    }

    private clearHighlights(meshes: AbstractMesh[]): void {
        for (const mesh of meshes) {
            setPlaneHighlight(mesh, false);
        }
    }

    private bindBackdropDismiss(backdrop: Rectangle, meshes: AbstractMesh[], onClose: () => void): void {
        const openedAt = performance.now();

        requestAnimationFrame(() => {
            backdrop.onPointerClickObservable.add(() => {
                if (performance.now() - openedAt < 300) return;
                this.close(meshes, onClose);
            });
        });
    }
}
