import {
    HighlightLayer,
    GlowLayer,
    SelectionOutlineLayer,
    Constants,
    ActionManager,
    ExecuteCodeAction,
    Color3,
    AbstractMesh,
    Mesh,
    type Scene,
} from "@babylonjs/core";

export type HighlightMode = "border" | "highlightLayer" | "glowLayer" | "selectionOutline";

export class HighlightManager {
    private scene: Scene | null = null;
    private mode: HighlightMode = "selectionOutline";
    private hovered: Mesh | null = null;
    private highlightLayer: HighlightLayer | null = null;
    private glowLayer: GlowLayer | null = null;
    private selectionLayer: SelectionOutlineLayer | null = null;

    init(scene: Scene): void {
        this.dispose();
        this.scene = scene;
        this.initBackend();
    }

    getMode(): HighlightMode {
        return this.mode;
    }

    setMode(mode: HighlightMode): void {
        if (this.mode === mode && this.hasBackend()) return;
        this.clear();
        this.disposeBackend();
        this.mode = mode;
        this.initBackend();
    }

    setHovered(mesh: AbstractMesh | null): void {
        if (this.hovered === mesh) return;
        this.clearHovered();
        if (!mesh) return;
        if (!(mesh instanceof Mesh)) {
            throw new Error("HighlightManager only supports Babylon Mesh instances");
        }

        this.hovered = mesh;
        switch (this.mode) {
            case "border":
                this.setBorderHighlight(mesh, true);
                break;
            case "highlightLayer":
                this.highlightLayer?.addMesh(this.hovered, Color3.White());
                break;
            case "glowLayer":
                this.glowLayer?.addIncludedOnlyMesh(this.hovered);
                break;
            case "selectionOutline":
                this.selectionLayer?.addSelection(mesh);
                break;
        }
    }

    makeInteractive(
        mesh: AbstractMesh,
        options: {
            isInteractionBlocked: () => boolean;
            onPick: () => void;
            onPointerOver?: () => void;
            onPointerOut?: () => void;
        },
    ): void {
        const scene = this.requireScene();
        mesh.isPickable = true;
        mesh.actionManager = new ActionManager(scene);
        mesh.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
                if (options.isInteractionBlocked()) return;
                this.setHovered(mesh);
                options.onPointerOver?.();
            }),
        );
        mesh.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
                this.setHovered(null);
                options.onPointerOut?.();
            }),
        );
        mesh.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
                if (options.isInteractionBlocked()) return;
                this.clear();
                options.onPick();
            }),
        );
    }

    clear(): void {
        this.clearHovered();
    }

    dispose(): void {
        this.clear();
        this.disposeBackend();
        this.scene = null;
    }

    private requireScene(): Scene {
        if (!this.scene) throw new Error("highlightManager.init(scene) must be called first");
        return this.scene;
    }

    private hasBackend(): boolean {
        if (this.mode === "border") return this.scene !== null;
        return Boolean(this.highlightLayer || this.glowLayer || this.selectionLayer);
    }

    private clearHovered(): void {
        if (!this.hovered) return;
        switch (this.mode) {
            case "border":
                this.setBorderHighlight(this.hovered, false);
                break;
            case "highlightLayer":
                this.highlightLayer?.removeMesh(this.hovered);
                break;
            case "glowLayer":
                this.glowLayer?.removeIncludedOnlyMesh(this.hovered);
                break;
            case "selectionOutline":
                this.selectionLayer?.clearSelection();
                break;
        }
        this.hovered = null;
    }

    private setBorderHighlight(mesh: AbstractMesh, visible: boolean): void {
        const border: unknown = mesh.metadata?.border;
        if (border instanceof AbstractMesh) border.isVisible = visible;
    }

    private initBackend(): void {
        const scene = this.requireScene();
        switch (this.mode) {
            case "highlightLayer":
                this.highlightLayer = new HighlightLayer("hoverHighlight", scene, {
                    isStroke: true,
                    mainTextureRatio: 2,
                    blurHorizontalSize: 1,
                    blurVerticalSize: 1,
                });
                this.highlightLayer.innerGlow = false;
                this.highlightLayer.outerGlow = true;
                break;
            case "glowLayer":
                this.glowLayer = new GlowLayer("hoverGlow", scene);
                this.glowLayer.intensity = 0.25;
                this.glowLayer.setExcludedByDefault(true);
                break;
            case "selectionOutline":
                this.selectionLayer = new SelectionOutlineLayer("hoverOutline", scene, {
                    mainTextureRatio: 1,
                    mainTextureSamples: 4,
                    useDepthOcclusion: true,
                    outlineMethod: Constants.OUTLINELAYER_SAMPLING_OCTADIRECTIONAL,
                });
                this.selectionLayer.outlineColor = Color3.White();
                this.selectionLayer.outlineThickness = 2;
                this.selectionLayer.occlusionStrength = 1;
                break;
            case "border":
                break;
        }
    }

    private disposeBackend(): void {
        this.highlightLayer?.dispose();
        this.highlightLayer = null;
        this.glowLayer?.dispose();
        this.glowLayer = null;
        this.selectionLayer?.dispose();
        this.selectionLayer = null;
    }
}

export const highlightManager = new HighlightManager();
