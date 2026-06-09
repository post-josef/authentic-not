import { setPlaneHighlight } from "./utils";
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
    private root: HTMLElement;
    private backdrop: HTMLElement;
    private panel: HTMLElement;
    private titleEl: HTMLElement;
    private imageEl: HTMLImageElement;
    private bodyEl: HTMLElement;
    private nextBtn: HTMLButtonElement;

    private detachCamera: () => void;
    private attachCamera: () => void;

    private open = false;
    private activeMeshes: AbstractMesh[] = [];
    private onCloseCallback: (() => void) | null = null;
    private onNextCallback: (() => void) | null = null;
    private backdropClickHandler: (() => void) | null = null;

    constructor(detachCamera: () => void, attachCamera: () => void) {
        const root = document.getElementById("modal-root");
        if (!root) throw new Error("Modal root element not found");

        const backdrop = root.querySelector<HTMLElement>(".modal-backdrop");
        const panel = root.querySelector<HTMLElement>(".modal-panel");
        const titleEl = root.querySelector<HTMLElement>(".modal-title");
        const imageEl = root.querySelector<HTMLImageElement>(".modal-image");
        const bodyEl = root.querySelector<HTMLElement>(".modal-body");
        const closeBtn = root.querySelector<HTMLButtonElement>(".modal-btn-close");
        const nextBtn = root.querySelector<HTMLButtonElement>(".modal-btn-next");

        if (!backdrop || !panel || !titleEl || !imageEl || !bodyEl || !closeBtn || !nextBtn) {
            throw new Error("Modal markup is incomplete");
        }

        this.root = root;
        this.backdrop = backdrop;
        this.panel = panel;
        this.titleEl = titleEl;
        this.imageEl = imageEl;
        this.bodyEl = bodyEl;
        this.nextBtn = nextBtn;
        this.detachCamera = detachCamera;
        this.attachCamera = attachCamera;

        closeBtn.addEventListener("click", () => this.close(this.onCloseCallback ?? undefined));
        nextBtn.addEventListener("click", () => {
            const onClose = this.onCloseCallback;
            const onNext = this.onNextCallback;
            this.close(() => {
                onClose?.();
                onNext?.();
            });
        });
        panel.addEventListener("click", (e) => e.stopPropagation());
    }

    isOpen(): boolean {
        return this.open;
    }

    show(options: ModalOptions): void {
        if (this.open) return;

        this.open = true;
        this.activeMeshes = options.meshes;
        this.onCloseCallback = options.onClose;
        this.onNextCallback = options.onNext ?? null;

        this.clearHighlights(options.meshes);
        options.meshes.forEach((m) => (m.isPickable = false));
        this.detachCamera();

        const config = options.windowConfig;
        this.panel.style.setProperty("--modal-color", config.color);
        this.panel.style.setProperty("--modal-offset-x", config.left);
        this.panel.style.setProperty("--modal-offset-y", config.top);

        this.titleEl.textContent = options.item.title;
        this.imageEl.src = options.item.img;
        this.imageEl.alt = options.item.title;
        this.bodyEl.textContent = options.item.text;

        const showNext = Boolean(options.item.showNextButton && options.onNext);
        this.nextBtn.hidden = !showNext;

        this.root.classList.remove("is-closing");
        this.root.classList.add("is-open");
        this.root.setAttribute("aria-hidden", "false");

        requestAnimationFrame(() => {
            if (this.open) this.root.classList.add("is-visible");
        });

        this.bindBackdropDismiss();
    }

    private close(onClosed?: () => void): void {
        if (!this.open) return;

        this.open = false;
        const meshes = this.activeMeshes;
        this.activeMeshes = [];
        this.onCloseCallback = null;
        this.onNextCallback = null;

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
                meshes.forEach((m) => (m.isPickable = true));
                this.attachCamera();
                onClosed?.();
            }
        };

        for (const el of elements) {
            el.addEventListener("transitionend", onTransitionEnd);
        }
    }

    private clearHighlights(meshes: AbstractMesh[]): void {
        for (const mesh of meshes) {
            setPlaneHighlight(mesh, false);
        }
    }

    private bindBackdropDismiss(): void {
        const openedAt = performance.now();

        this.backdropClickHandler = (): void => {
            if (performance.now() - openedAt < 300) return;
            this.close(this.onCloseCallback ?? undefined);
        };

        requestAnimationFrame(() => {
            if (this.backdropClickHandler) {
                this.backdrop.addEventListener("click", this.backdropClickHandler);
            }
        });
    }
}
