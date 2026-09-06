import type { AbstractMesh } from "@babylonjs/core";
import type { EmbedProvider } from "../types";
import { cameraManager } from "./camera";
import { highlightManager } from "./highlight";

type ModalCallback = () => void | Promise<void>;
type ModalItemStyle = Record<string, string>;

interface ModalItemBase {
    id?: string;
    className?: string;
    style?: ModalItemStyle;
}

export type ModalContentItem =
    | (ModalItemBase & { type: "text"; content: string; tag?: "p" | "h1" | "h2" | "h3" | "div" })
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

function buildEmbedSrc(item: Extract<ModalContentItem, { type: "embed" }>): string {
    const provider = item.provider ?? "generic";
    const autoplay = item.autoplay ?? false;
    const muted = item.muted ?? autoplay;
    const extra = item.params ?? {};
    const withParams = (base: string, params: Record<string, string>) => {
        const url = new URL(base);
        for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
        return url.toString();
    };

    if (provider === "youtube") {
        const id = item.videoId;
        if (!id && item.src) return item.src;
        if (!id) throw new Error("YouTube embed requires videoId or src");
        return withParams(`https://www.youtube.com/embed/${id}`, {
            autoplay: autoplay ? "1" : "0",
            mute: muted ? "1" : "0",
            rel: "0",
            ...extra,
        });
    }

    if (provider === "vimeo") {
        const id = item.videoId;
        if (!id && item.src) return item.src;
        if (!id) throw new Error("Vimeo embed requires videoId or src");
        return withParams(`https://player.vimeo.com/video/${id}`, {
            autoplay: autoplay ? "1" : "0",
            muted: muted ? "1" : "0",
            autopause: "0",
            ...extra,
        });
    }

    if (!item.src) throw new Error("Generic embed requires src");
    return item.src;
}

export class ModalManager {
    private root: HTMLElement | null = null;
    private backdrop: HTMLElement | null = null;
    private panel: HTMLElement | null = null;
    private content: HTMLElement | null = null;
    private openState = false;
    private closing = false;
    private activeMeshes: Array<{ mesh: AbstractMesh; wasPickable: boolean }> = [];
    private appliedClass = "";
    private appliedStyles: string[] = [];
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
        this.activeMeshes = (config.pickableMeshes ?? []).map((mesh) => ({
            mesh,
            wasPickable: mesh.isPickable,
        }));
        this.previouslyFocused =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
        this.root = null;
        this.backdrop = null;
        this.panel = null;
        this.content = null;
    }

    private renderContent(items: ModalContentItem[]): void {
        const content = this.content;
        if (!content) throw new Error("modalManager.init() must be called first");
        content.replaceChildren(...items.map((item) => this.createItem(item)));
    }

    private createItem(item: ModalContentItem): HTMLElement {
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
                image.addEventListener("error", () =>
                    console.warn(`[modalManager] Failed to load image ${item.src}`),
                );
                element = image;
                break;
            }
            case "video": {
                const video = document.createElement("video");
                video.src = item.src;
                video.controls = item.controls !== false;
                video.autoplay = item.autoplay ?? false;
                video.muted = item.muted ?? false;
                video.loop = item.loop ?? false;
                if (item.poster) video.poster = item.poster;
                element = video;
                break;
            }
            case "embed": {
                const embed = document.createElement("iframe");
                embed.src = buildEmbedSrc(item);
                embed.allow =
                    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
                embed.allowFullscreen = true;
                embed.title = "Embedded media";
                element = embed;
                break;
            }
            case "button": {
                const button = document.createElement("button");
                button.type = "button";
                button.textContent = item.label;
                button.addEventListener("click", () => void item.onClick());
                element = button;
                break;
            }
            case "buttons": {
                const group = document.createElement("div");
                item.buttons.forEach((definition) => {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.textContent = definition.label;
                    button.className = definition.className ?? "modal-btn";
                    this.applyStyles(button, definition.style);
                    button.addEventListener("click", () => void definition.onClick());
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

        if (item.id) element.id = item.id;
        if (item.className) element.className = item.className;
        else if (item.type === "button") element.className = "modal-btn";
        else if (item.type === "buttons") element.className = "modal-actions";
        else if (item.type === "embed") element.className = "modal-embed";
        else if (item.type === "spacer") element.className = "modal-spacer";
        else if (item.type === "divider") element.className = "modal-divider";
        this.applyStyles(element, item.style);
        return element;
    }

    private applyConfigStyle(config: ModalConfig): void {
        const panel = this.requirePanel();
        this.appliedClass = config.style?.className ?? "";
        if (this.appliedClass) panel.classList.add(this.appliedClass);
        Object.entries(config.style?.vars ?? {}).forEach(([property, value]) => {
            panel.style.setProperty(property, value);
            this.appliedStyles.push(property);
        });
        if (config.style?.width) {
            panel.style.width = config.style.width;
            this.appliedStyles.push("width");
        }
        if (config.style?.maxHeight) {
            panel.style.maxHeight = config.style.maxHeight;
            this.appliedStyles.push("max-height");
        }
    }

    private clearConfigStyle(): void {
        if (!this.panel) return;
        if (this.appliedClass) this.panel.classList.remove(this.appliedClass);
        this.appliedStyles.forEach((property) => this.panel?.style.removeProperty(property));
        this.appliedClass = "";
        this.appliedStyles = [];
    }

    private applyStyles(element: HTMLElement, styles: Record<string, string> | undefined): void {
        Object.entries(styles ?? {}).forEach(([property, value]) =>
            element.style.setProperty(property, value),
        );
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
