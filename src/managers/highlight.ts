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
} from "@babylonjs/core";
import type { Scene } from "@babylonjs/core";
import type { HighlightMode } from "../types";

export class HighlightManager {
    private scene: Scene | null = null;
    private hovered: Mesh | null = null;
    private hoveredMode: HighlightMode | null = null;
    private highlightLayer: HighlightLayer | null = null;
    private glowLayer: GlowLayer | null = null;
    private selectionLayer: SelectionOutlineLayer | null = null;

    init(scene: Scene) {
        this.dispose();
        this.scene = scene;
    }

    makeInteractive(
        mesh: AbstractMesh,
        handlers: { onClick: () => void; onHover?: () => void; onHoverEnd?: () => void },
    ) {
        if (!this.scene) throw new Error("highlightManager.init(scene) must be called first");
        mesh.isPickable = true;
        mesh.actionManager = new ActionManager(this.scene);
        mesh.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
                this.setHovered(mesh);
                handlers.onHover?.();
            }),
        );
        mesh.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
                this.setHovered(null);
                handlers.onHoverEnd?.();
            }),
        );
        mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => handlers.onClick()));
    }

    clear() {
        this.clearHovered();
    }

    dispose() {
        this.clear();
        this.highlightLayer?.dispose();
        this.highlightLayer = null;
        this.glowLayer?.dispose();
        this.glowLayer = null;
        this.selectionLayer?.dispose();
        this.selectionLayer = null;
        this.scene = null;
    }

    private setHovered(mesh: AbstractMesh | null) {
        if (this.hovered === mesh) return;
        this.clearHovered();
        if (!mesh || !(mesh instanceof Mesh)) return;

        const mode = mesh.metadata?.highlightMode as HighlightMode | undefined;
        if (!mode) return;

        this.ensureBackend(mode);
        this.hovered = mesh;
        this.hoveredMode = mode;
        switch (mode) {
            case "border":
                this.setBorderHighlight(mesh, true);
                break;
            case "highlightLayer":
                this.highlightLayer?.addMesh(mesh, Color3.White());
                break;
            case "glow":
                this.glowLayer?.addIncludedOnlyMesh(mesh);
                break;
            case "outline":
                this.selectionLayer?.addSelection(mesh);
                break;
        }
    }

    private clearHovered() {
        if (!this.hovered || !this.hoveredMode) return;
        switch (this.hoveredMode) {
            case "border":
                this.setBorderHighlight(this.hovered, false);
                break;
            case "highlightLayer":
                this.highlightLayer?.removeMesh(this.hovered);
                break;
            case "glow":
                this.glowLayer?.removeIncludedOnlyMesh(this.hovered);
                break;
            case "outline":
                this.selectionLayer?.clearSelection();
                break;
        }
        this.hovered = null;
        this.hoveredMode = null;
    }

    private setBorderHighlight(mesh: AbstractMesh, visible: boolean) {
        const border: unknown = mesh.metadata?.border;
        if (border instanceof AbstractMesh) border.isVisible = visible;
    }

    private ensureBackend(mode: HighlightMode) {
        if (!this.scene) return;
        switch (mode) {
            case "highlightLayer":
                if (this.highlightLayer) return;
                this.highlightLayer = new HighlightLayer("hoverHighlight", this.scene, {
                    isStroke: true,
                    mainTextureRatio: 2,
                    blurHorizontalSize: 1,
                    blurVerticalSize: 1,
                });
                this.highlightLayer.innerGlow = false;
                this.highlightLayer.outerGlow = true;
                break;
            case "glow":
                if (this.glowLayer) return;
                this.glowLayer = new GlowLayer("hoverGlow", this.scene);
                this.glowLayer.intensity = 0.25;
                this.glowLayer.setExcludedByDefault(true);
                break;
            case "outline":
                if (this.selectionLayer) return;
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
}

export const highlightManager = new HighlightManager();
