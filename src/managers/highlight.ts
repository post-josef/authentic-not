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
import type { HighlightMode } from "../types";

export type { HighlightMode } from "../types";

export class HighlightManager {
    private scene: Scene | null = null;
    private mode: HighlightMode = "selectionOutline";
    private hovered: Mesh | null = null;
    private hoveredMode: HighlightMode | null = null;
    private highlightLayer: HighlightLayer | null = null;
    private glowLayer: GlowLayer | null = null;
    private selectionLayer: SelectionOutlineLayer | null = null;

    init(scene: Scene): void {
        this.dispose();
        this.scene = scene;
        this.ensureBackend(this.mode);
    }

    getMode(): HighlightMode {
        return this.mode;
    }

    setMode(mode: HighlightMode): void {
        if (this.mode === mode && this.hasBackend()) return;
        this.clear();
        this.disposeBackend();
        this.mode = mode;
        this.ensureBackend(this.mode);
    }

    setHovered(mesh: AbstractMesh | null): void {
        if (this.hovered === mesh) return;
        this.clearHovered();
        if (!mesh) return;
        if (!(mesh instanceof Mesh)) {
            throw new Error("HighlightManager only supports Babylon Mesh instances");
        }

        const mode = mesh.metadata?.highlightMode ?? this.mode;
        this.ensureBackend(mode);
        this.hovered = mesh;
        this.hoveredMode = mode;
        switch (mode) {
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
        mesh.metadata = { ...mesh.metadata, clickable: true };
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
        switch (this.hoveredMode ?? this.mode) {
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
        this.hoveredMode = null;
    }

    private setBorderHighlight(mesh: AbstractMesh, visible: boolean): void {
        const border: unknown = mesh.metadata?.border;
        if (border instanceof AbstractMesh) border.isVisible = visible;
    }

    private ensureBackend(mode: HighlightMode): void {
        const scene = this.requireScene();
        switch (mode) {
            case "highlightLayer":
                if (this.highlightLayer) return;
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
                if (this.glowLayer) return;
                this.glowLayer = new GlowLayer("hoverGlow", scene);
                this.glowLayer.intensity = 0.25;
                this.glowLayer.setExcludedByDefault(true);
                break;
            case "selectionOutline":
                if (this.selectionLayer) return;
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
