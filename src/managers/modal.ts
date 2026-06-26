import type { AbstractMesh } from "@babylonjs/core";
import type { ModalActionContext, ModalBlock, ModalConfig } from "../modal/types";
import type { CameraManager } from "./camera";
import type { HighlightManager } from "./highlight";
import type { SceneManager } from "./scene";

export class ModalManager {
    private readonly root: HTMLElement;
    private readonly backdrop: HTMLElement;
    private readonly panel: HTMLElement;
    private readonly content: HTMLElement;
    private readonly camera: CameraManager;
    private readonly highlight: HighlightManager;
    private readonly scenes: SceneManager;

    private open = false;
    private activeMeshes: AbstractMesh[] = [];
    private backdropClickHandler: (() => void) | null = null;
    private panelClassName = "";

    constructor(options: {
        camera: CameraManager;
        highlight: HighlightManager;
        scenes: SceneManager;
    }) {
        const root = document.getElementById("modal-root");
        if (!root) throw new Error("Modal root element not found");

        const backdrop = root.querySelector<HTMLElement>(".modal-backdrop");
        const panel = root.querySelector<HTMLElement>(".modal-panel");
        const content = root.querySelector<HTMLElement>(".modal-content");

        if (!backdrop || !panel || !content) {
            throw new Error("Modal markup is incomplete");
        }

        this.root = root;
        this.backdrop = backdrop;
        this.panel = panel;
        this.content = content;
        this.camera = options.camera;
        this.highlight = options.highlight;
        this.scenes = options.scenes;

        panel.addEventListener("click", (e) => e.stopPropagation());
    }

    isOpen(): boolean {
        return this.open;
    }

    show(config: ModalConfig): void {
        if (this.open) return;

        this.open = true;
        this.activeMeshes = config.pickableMeshes ?? this.scenes.getMeshes();

        this.highlight.clear();
        this.activeMeshes.forEach((m) => (m.isPickable = false));
        this.camera.detachControl();

        this.applyStyle(config);
        this.renderContent(config.blocks);

        this.root.classList.remove("is-closing");
        this.root.classList.add("is-open");
        this.root.setAttribute("aria-hidden", "false");

        requestAnimationFrame(() => {
            if (this.open) this.root.classList.add("is-visible");
        });

        this.bindBackdropDismiss();
    }

    close(afterClose?: () => void): void {
        if (!this.open) return;

        this.open = false;
        const meshes = this.activeMeshes;
        this.activeMeshes = [];

        if (this.backdropClickHandler) {
            this.backdrop.removeEventListener("click", this.backdropClickHandler);
            this.backdropClickHandler = null;
        }

        this.root.classList.remove("is-visible");
        this.root.classList.add("is-closing");

        const elements = [this.backdrop, this.panel];
        let remaining = elements.length;

        const onTransitionEnd = (e: TransitionEvent): void => {
            if (e.propertyName !== "opacity") return;
            remaining -= 1;
            if (remaining === 0) {
                for (const el of elements) {
                    el.removeEventListener("transitionend", onTransitionEnd);
                }
                this.root.classList.remove("is-open", "is-closing");
                this.root.setAttribute("aria-hidden", "true");
                this.content.replaceChildren();
                if (this.panelClassName) {
                    this.panel.classList.remove(this.panelClassName);
                    this.panelClassName = "";
                }
                this.panel.style.removeProperty("--modal-color");
                this.panel.style.removeProperty("--modal-offset-x");
                this.panel.style.removeProperty("--modal-offset-y");
                meshes.forEach((m) => (m.isPickable = true));
                this.camera.attachControl();
                afterClose?.();
            }
        };

        for (const el of elements) {
            el.addEventListener("transitionend", onTransitionEnd);
        }
    }

    createActionContext(): ModalActionContext {
        return { modal: this, scenes: this.scenes };
    }

    private applyStyle(config: ModalConfig): void {
        const style = config.style;
        if (style?.className) {
            this.panelClassName = style.className;
            this.panel.classList.add(style.className);
        }
        if (style?.vars) {
            for (const [key, value] of Object.entries(style.vars)) {
                this.panel.style.setProperty(key, value);
            }
        }
    }

    private renderContent(blocks: ModalBlock[]): void {
        this.content.replaceChildren();
        const ctx = this.createActionContext();

        for (const block of blocks) {
            this.content.appendChild(this.createBlockElement(block, ctx));
        }
    }

    private createBlockElement(block: ModalBlock, ctx: ModalActionContext): HTMLElement {
        switch (block.type) {
            case "text": {
                const el = document.createElement("p");
                el.textContent = block.content;
                if (block.className) el.className = block.className;
                return el;
            }
            case "image": {
                const el = document.createElement("img");
                el.src = block.src;
                el.alt = block.alt ?? "";
                if (block.className) el.className = block.className;
                return el;
            }
            case "video": {
                const el = document.createElement("video");
                el.src = block.src;
                el.controls = true;
                if (block.className) el.className = block.className;
                return el;
            }
            case "embed": {
                const el = document.createElement("iframe");
                el.src = block.src;
                el.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
                el.allowFullscreen = true;
                if (block.className) el.className = block.className;
                return el;
            }
            case "buttons": {
                const group = document.createElement("div");
                if (block.className) group.className = block.className;
                else group.className = "modal-actions";

                for (const btn of block.buttons) {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.textContent = btn.label;
                    button.className = btn.className ?? "modal-btn";
                    button.addEventListener("click", () => btn.action(ctx));
                    group.appendChild(button);
                }
                return group;
            }
        }
    }

    private bindBackdropDismiss(): void {
        const openedAt = performance.now();

        this.backdropClickHandler = (): void => {
            if (performance.now() - openedAt < 300) return;
            this.close();
        };

        requestAnimationFrame(() => {
            if (this.backdropClickHandler) {
                this.backdrop.addEventListener("click", this.backdropClickHandler);
            }
        });
    }
}
