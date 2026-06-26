import {
    HighlightLayer,
    GlowLayer,
    SelectionOutlineLayer,
    Constants,
    ActionManager,
    ExecuteCodeAction,
    Color3,
    Scene,
    AbstractMesh,
    Mesh,
} from "@babylonjs/core";

export type HighlightMode = "border" | "highlightLayer" | "glowLayer" | "selectionOutline";

export class HighlightManager {
    private readonly scene: Scene;
    private mode: HighlightMode = "selectionOutline";
    private hovered: Mesh | null = null;

    private highlightLayer: HighlightLayer | null = null;
    private glowLayer: GlowLayer | null = null;
    private selectionLayer: SelectionOutlineLayer | null = null;

    constructor(scene: Scene) {
        this.scene = scene;
        this.initBackend();
    }

    getMode(): HighlightMode {
        return this.mode;
    }

    setMode(mode: HighlightMode): void {
        if (this.mode === mode) return;
        this.clear();
        this.disposeBackend();
        this.mode = mode;
        this.initBackend();
    }

    setHovered(mesh: AbstractMesh | null): void {
        if (this.hovered === mesh) return;

        this.clearHovered();

        if (!mesh) return;

        this.hovered = mesh as Mesh;

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

    clear(): void {
        this.clearHovered();
    }

    dispose(): void {
        this.clear();
        this.disposeBackend();
    }

    makeInteractive(
        mesh: AbstractMesh,
        options: {
            isInteractionBlocked: () => boolean;
            onPick: () => void;
        },
    ): void {
        mesh.actionManager = new ActionManager(this.scene);
        mesh.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
                if (options.isInteractionBlocked()) return;
                this.setHovered(mesh);
            }),
        );
        mesh.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
                this.setHovered(null);
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

    private setBorderHighlight(mesh: AbstractMesh, on: boolean): void {
        const border = mesh.metadata?.border as AbstractMesh | undefined;
        if (border) border.isVisible = on;
    }

    private initBackend(): void {
        switch (this.mode) {
            case "highlightLayer":
                this.highlightLayer = new HighlightLayer("hoverHighlight", this.scene, {
                    isStroke: true,
                    mainTextureRatio: 2,
                    blurHorizontalSize: 1,
                    blurVerticalSize: 1,
                });
                this.highlightLayer.innerGlow = false;
                this.highlightLayer.outerGlow = true;
                break;
            case "glowLayer":
                this.glowLayer = new GlowLayer("hoverGlow", this.scene, {
                    // mainTextureRatio: 0.5,
                    // blurKernelSize: 28,
                });
                this.glowLayer.intensity = 0.25;
                this.glowLayer.setExcludedByDefault(true);
                break;
            case "selectionOutline":
                this.selectionLayer = new SelectionOutlineLayer("hoverOutline", this.scene, {
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
