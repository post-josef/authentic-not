import type { AbstractMesh } from "@babylonjs/core";
import type { ModalButtonAction, ModalContent } from "../types";
import { cameraManager } from "./camera";
import { highlightManager } from "./highlight";

type ModalRuntimeItem = ModalContent | { type: "button"; label: string; onClick: () => void; className?: string };

export interface ModalConfig {
    className?: string;
    width?: string;
    maxHeight?: string;
    content: ModalRuntimeItem[];
    onSceneSwitch?: (sceneId: string) => void;
    pickableMeshes?: AbstractMesh[];
    dismissOnBackdrop?: boolean;
}

function buildEmbedSrc(source: string): string {
    const withParams = (base: string, params: Record<string, string>) => {
        const url = new URL(base);
        for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
        return url.toString();
    };

    let url: URL;
    try {
        url = new URL(source);
    } catch {
        return source;
    }

    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
        const id =
            url.searchParams.get("v") ?? (url.pathname.startsWith("/embed/") ? url.pathname.split("/")[2] : undefined);
        if (id) return withParams(`https://www.youtube.com/embed/${id}`, { autoplay: "1", rel: "0" });
    }
    if (host === "youtu.be") {
        const id = url.pathname.slice(1);
        if (id) return withParams(`https://www.youtube.com/embed/${id}`, { autoplay: "1", rel: "0" });
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
        const id = url.pathname.split("/").filter(Boolean).pop();
        if (id) return withParams(`https://player.vimeo.com/video/${id}`, { autoplay: "1", autopause: "0" });
    }
    if (url.pathname.includes("/embed")) return withParams(source, { autoplay: "1" });
    return source;
}

export class ModalManager {
    private root: HTMLElement | null = null;
    private backdrop: HTMLElement | null = null;
    private panel: HTMLElement | null = null;
    private content: HTMLElement | null = null;
    private openState = false;
    private closing = false;
    private activeMeshes: Array<{ mesh: AbstractMesh; wasPickable: boolean }> = [];
    private appliedClasses: string[] = [];
    private appliedStyles: string[] = [];
    private onSceneSwitch: ((sceneId: string) => void) | undefined;
    private backdropHandler: (() => void) | null = null;
    private keydownHandler: ((event: KeyboardEvent) => void) | null = null;
    private transitionHandler: ((event: TransitionEvent) => void) | null = null;
    private closeTimer: number | null = null;
    private closeCallbacks: Array<() => void> = [];
    private previouslyFocused: HTMLElement | null = null;
    private readonly panelClickHandler = (event: Event) => event.stopPropagation();

    init(): void {
        this.dispose();
        const root = document.getElementById("modal-root");
        const backdrop = root?.querySelector<HTMLElement>(".modal-backdrop");
        const panel = root?.querySelector<HTMLElement>(".modal-panel");
        const content = root?.querySelector<HTMLElement>(".modal-content");
        if (!root || !backdrop || !panel || !content) throw new Error("Modal markup is incomplete");
        this.root = root;
        this.backdrop = backdrop;
        this.panel = panel;
        this.content = content;
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-modal", "true");
        panel.setAttribute("tabindex", "-1");
        panel.addEventListener("click", this.panelClickHandler);
    }

    isOpen(): boolean {
        return this.openState || this.closing;
    }

    open(config: ModalConfig): void {
        const root = this.requireRoot();
        if (this.openState || this.closing) return;

        this.openState = true;
        this.onSceneSwitch = config.onSceneSwitch;
        const pickableMeshes = config.pickableMeshes ?? [];
        this.activeMeshes = pickableMeshes.map((mesh) => ({
            mesh,
            wasPickable: mesh.isPickable,
        }));
        this.previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        highlightManager.clear();
        this.activeMeshes.forEach(({ mesh }) => (mesh.isPickable = false));
        cameraManager.detachControl();

        this.applyConfigStyle(config);
        this.renderContent(config.content);
        root.classList.remove("is-closing");
        root.classList.add("is-open");
        root.setAttribute("aria-hidden", "false");
        requestAnimationFrame(() => {
            if (!this.openState) return;
            root.classList.add("is-visible");
        });

        if (config.dismissOnBackdrop !== false) this.bindBackdrop();
        this.bindKeyboard();
    }

    close(afterClose?: () => void): void {
        if (this.closing) return;
        if (afterClose) this.closeCallbacks.push(afterClose);
        if (!this.openState) {
            this.runCloseCallbacks();
            return;
        }
        const root = this.requireRoot();
        const elements = [this.requireBackdrop(), this.requirePanel()];
        this.openState = false;
        this.closing = true;
        this.unbindEvents();
        root.classList.remove("is-visible");
        root.classList.add("is-closing");

        let remaining = elements.length;
        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            this.clearCloseWait();
            root.classList.remove("is-open", "is-closing");
            root.setAttribute("aria-hidden", "true");
            this.content?.replaceChildren();
            this.clearConfigStyle();
            this.restoreMeshPickability();
            cameraManager.attachControl();
            this.previouslyFocused?.focus();
            this.previouslyFocused = null;
            this.closing = false;
            this.runCloseCallbacks();
            this.onSceneSwitch = undefined;
        };
        const transitionHandler = (event: TransitionEvent) => {
            if (event.target !== event.currentTarget || event.propertyName !== "opacity") return;
            remaining -= 1;
            if (remaining <= 0) finish();
        };
        this.transitionHandler = transitionHandler;
        elements.forEach((element) => element.addEventListener("transitionend", transitionHandler));
        this.closeTimer = window.setTimeout(finish, 250);
    }

    dispose(): void {
        const hadInteractionLock = this.openState || this.closing;
        this.unbindEvents();
        this.clearCloseWait();
        this.panel?.removeEventListener("click", this.panelClickHandler);
        this.openState = false;
        this.closing = false;
        this.closeCallbacks = [];
        this.root?.classList.remove("is-open", "is-visible", "is-closing");
        this.root?.setAttribute("aria-hidden", "true");
        this.content?.replaceChildren();
        this.clearConfigStyle();
        this.restoreMeshPickability();
        if (hadInteractionLock) cameraManager.attachControl();
        this.previouslyFocused = null;
        this.onSceneSwitch = undefined;
        this.root = null;
        this.backdrop = null;
        this.panel = null;
        this.content = null;
    }

    private renderContent(items: ModalRuntimeItem[]): void {
        const content = this.content;
        if (!content) throw new Error("modalManager.init() must be called first");
        content.replaceChildren(...items.map((item) => this.createItem(item)));
    }

    private createItem(item: ModalRuntimeItem): HTMLElement {
        if (item.type === "button") {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = item.label;
            button.className = item.className ?? "modal-btn";
            button.addEventListener("click", () => void item.onClick());
            return button;
        }

        let element: HTMLElement;
        switch (item.type) {
            case "text":
                element = document.createElement(item.tag ?? "p");
                element.textContent = item.content;
                break;
            case "image": {
                const image = document.createElement("img");
                image.src = item.src;
                image.alt = item.alt ?? "";
                if (item.width !== undefined) image.style.width = `${item.width}px`;
                if (item.height !== undefined) image.style.height = `${item.height}px`;
                image.addEventListener("error", () => console.warn(`[modalManager] Failed to load image ${item.src}`));
                element = image;
                break;
            }
            case "video": {
                const video = document.createElement("video");
                video.src = item.src;
                video.controls = true;
                video.autoplay = true;
                element = video;
                break;
            }
            case "embed": {
                const embed = document.createElement("iframe");
                embed.src = buildEmbedSrc(item.source);
                embed.allow =
                    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
                embed.allowFullscreen = true;
                embed.title = "Embedded media";
                element = embed;
                break;
            }
            case "buttons": {
                const group = document.createElement("div");
                group.className = "modal-actions";
                item.buttons.forEach((definition) => {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.textContent = definition.label;
                    button.className =
                        definition.action === "close" ? "modal-btn modal-btn-close" : "modal-btn modal-btn-next";
                    button.addEventListener("click", () => void this.runButtonAction(definition.action));
                    group.appendChild(button);
                });
                element = group;
                break;
            }
            case "spacer":
                element = document.createElement("div");
                element.style.height = item.height ?? "16px";
                break;
            case "divider":
                element = document.createElement("hr");
                break;
        }

        return element;
    }

    private runButtonAction(action: ModalButtonAction): void {
        if (action === "close") {
            this.close();
            return;
        }
        this.close(() => this.onSceneSwitch?.(action.scene));
    }

    private applyConfigStyle(config: ModalConfig): void {
        const panel = this.requirePanel();
        this.appliedClasses = (config.className ?? "").split(/\s+/).filter(Boolean);
        this.appliedClasses.forEach((name) => panel.classList.add(name));
        if (config.width) {
            panel.style.width = config.width;
            this.appliedStyles.push("width");
        }
        if (config.maxHeight) {
            panel.style.maxHeight = config.maxHeight;
            this.appliedStyles.push("max-height");
        }
    }

    private clearConfigStyle(): void {
        if (!this.panel) return;
        this.appliedClasses.forEach((name) => this.panel?.classList.remove(name));
        this.appliedClasses = [];
        this.appliedStyles.forEach((property) => this.panel?.style.removeProperty(property));
        this.appliedStyles = [];
    }

    private bindBackdrop(): void {
        const openedAt = performance.now();
        this.backdropHandler = () => {
            if (performance.now() - openedAt >= 300) this.close();
        };
        requestAnimationFrame(() => {
            if (this.backdropHandler) this.requireBackdrop().addEventListener("click", this.backdropHandler);
        });
    }

    private bindKeyboard(): void {
        this.keydownHandler = (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                this.close();
                return;
            }
            if (event.key !== "Tab") return;
            const focusable = this.getFocusable();
            if (focusable.length === 0) {
                event.preventDefault();
                this.requirePanel().focus();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", this.keydownHandler);
    }

    private unbindEvents(): void {
        if (this.backdrop && this.backdropHandler) {
            this.backdrop.removeEventListener("click", this.backdropHandler);
        }
        if (this.keydownHandler) document.removeEventListener("keydown", this.keydownHandler);
        this.backdropHandler = null;
        this.keydownHandler = null;
    }

    private getFocusable(): HTMLElement[] {
        return this.panel
            ? Array.from(
                  this.panel.querySelectorAll<HTMLElement>(
                      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
                  ),
              ).filter((element) => !element.hasAttribute("disabled"))
            : [];
    }

    private clearCloseWait(): void {
        if (this.transitionHandler) {
            this.backdrop?.removeEventListener("transitionend", this.transitionHandler);
            this.panel?.removeEventListener("transitionend", this.transitionHandler);
        }
        this.transitionHandler = null;
        if (this.closeTimer !== null) window.clearTimeout(this.closeTimer);
        this.closeTimer = null;
    }

    private restoreMeshPickability(): void {
        this.activeMeshes.forEach(({ mesh, wasPickable }) => {
            if (!mesh.isDisposed()) mesh.isPickable = wasPickable;
        });
        this.activeMeshes = [];
    }

    private runCloseCallbacks(): void {
        const callbacks = this.closeCallbacks;
        this.closeCallbacks = [];
        callbacks.forEach((callback) => callback());
    }

    private requireRoot(): HTMLElement {
        if (!this.root) throw new Error("modalManager.init() must be called first");
        return this.root;
    }

    private requireBackdrop(): HTMLElement {
        if (!this.backdrop) throw new Error("modalManager.init() must be called first");
        return this.backdrop;
    }

    private requirePanel(): HTMLElement {
        if (!this.panel) throw new Error("modalManager.init() must be called first");
        return this.panel;
    }
}

export const modalManager = new ModalManager();
