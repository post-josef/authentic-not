export interface SubtitleOptions {
    delayMs?: number;
    className?: string;
    style?: Record<string, string>;
}

export class SubtitleManager {
    private root: HTMLElement | null = null;
    private line: HTMLElement | null = null;
    private showTimer: ReturnType<typeof setTimeout> | null = null;
    private hideTimer: ReturnType<typeof setTimeout> | null = null;

    init(): void {
        this.dispose();
        const root = document.getElementById("subtitle-root");
        const line = root?.querySelector<HTMLElement>(".subtitle-line");
        if (!root || !line) throw new Error("Subtitle markup is incomplete");
        this.root = root;
        this.line = line;
    }

    show(text: string, durationMs: number, options: SubtitleOptions = {}): void {
        this.clear();
        const reveal = () => {
            if (!this.root || !this.line) return;
            this.line.textContent = text;
            this.line.className = options.className
                ? `subtitle-line ${options.className}`
                : "subtitle-line";
            if (options.style) {
                Object.entries(options.style).forEach(([key, value]) =>
                    this.line?.style.setProperty(key, value),
                );
            }
            this.root.classList.add("is-visible");
            this.hideTimer = setTimeout(() => this.hide(), durationMs);
        };

        if (options.delayMs && options.delayMs > 0) {
            this.showTimer = setTimeout(reveal, options.delayMs);
        } else {
            reveal();
        }
    }

    hide(): void {
        this.clearTimers();
        this.root?.classList.remove("is-visible");
        if (this.line) this.line.textContent = "";
    }

    clear(): void {
        this.hide();
        if (this.line) {
            this.line.className = "subtitle-line";
            this.line.removeAttribute("style");
        }
    }

    dispose(): void {
        this.clear();
        this.root = null;
        this.line = null;
    }

    private clearTimers(): void {
        if (this.showTimer) clearTimeout(this.showTimer);
        if (this.hideTimer) clearTimeout(this.hideTimer);
        this.showTimer = null;
        this.hideTimer = null;
    }
}

export const subtitleManager = new SubtitleManager();
