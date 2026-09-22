import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import { Axis, Color3, Material, MeshBuilder, Space, StandardMaterial, Texture, VideoTexture } from "@babylonjs/core";
import type { AbstractMesh, BaseTexture, Scene } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import type { HighlightMode, Object3D } from "../types";
import { highlightManager } from "./highlight";
import { modalManager } from "./modal";
import { sceneManager } from "./scene";
import { subtitleManager } from "./subtitle";

const PLANE_WIDTH = 2.3;
const PLANE_HEIGHT = 3.2;
const BORDER_WIDTH = 0.04;

function videoTextureOnError(message?: string) {
    if (message?.includes("interrupted")) return;
    console.warn(`[objectManager] ${message ?? "Video texture error"}`);
}

function applyPlaneMaterial(
    mesh: AbstractMesh,
    texture: BaseTexture,
    scene: Scene,
    options: { width?: number; height?: number; frameOverlay?: boolean; highlight?: HighlightMode } = {},
) {
    const highlightMode = options.highlight ?? "outline";
    const material = new StandardMaterial(`${mesh.name}Mat`, scene);
    material.diffuseTexture = texture;
    material.emissiveColor = Color3.White();
    material.backFaceCulling = false;

    if (options.frameOverlay) {
        material.useAlphaFromDiffuseTexture = true;
        material.transparencyMode = Material.MATERIAL_ALPHATESTANDBLEND;
        material.alphaCutOff = 0.5;
    } else if (highlightMode === "border") {
        material.opacityTexture = texture;
    } else {
        material.useAlphaFromDiffuseTexture = true;
        material.transparencyMode =
            highlightMode === "outline" ? Material.MATERIAL_ALPHATESTANDBLEND : Material.MATERIAL_ALPHATEST;
        material.alphaCutOff = 0.4;
    }

    mesh.material = material;
    if (options.highlight !== undefined) {
        mesh.metadata = { ...mesh.metadata, highlightMode: options.highlight };
    }

    if (highlightMode !== "border" || options.width === undefined || options.height === undefined) return;

    const border = MeshBuilder.CreatePlane(
        `${mesh.name}Border`,
        { width: options.width + BORDER_WIDTH * 2, height: options.height + BORDER_WIDTH * 2 },
        scene,
    );
    border.parent = mesh;
    border.position.z = -0.005;
    border.isVisible = false;
    border.isPickable = false;
    const borderMaterial = new StandardMaterial(`${mesh.name}BorderMat`, scene);
    borderMaterial.emissiveColor = Color3.White();
    borderMaterial.disableLighting = true;
    border.material = borderMaterial;
    border.renderingGroupId = 0;
    mesh.renderingGroupId = 1;
    mesh.metadata = { ...mesh.metadata, highlightMode: options.highlight, border };
}

export class ObjectManager {
    private scene: Scene | null = null;

    init(scene: Scene) {
        this.scene = scene;
    }

    interactive(
        mesh: AbstractMesh,
        handlers: {
            onClick: () => void;
            onHover?: () => void;
            onHoverEnd?: () => void;
        },
    ) {
        for (const part of [mesh, ...mesh.getChildMeshes()]) {
            if (part.name.endsWith("Border")) continue;
            highlightManager.makeInteractive(part, handlers);
        }
    }

    openModal(object: Object3D, hooks: { onSceneSwitch?: (sceneId: string) => void } = {}) {
        if (!object.modal?.length) return;
        modalManager.open({
            className: object.modalClassName,
            content: object.modal,
            onSceneSwitch: (sceneId) => {
                hooks.onSceneSwitch?.(sceneId);
                sceneManager.switchTo(sceneId);
            },
        });
    }

    async create(object: Object3D): Promise<AbstractMesh> {
        if (!this.scene) throw new Error("objectManager.init(scene) must be called first");
        const scene = this.scene;
        const path = object.source.split(/[?#]/, 1)[0].toLowerCase();
        let mesh: AbstractMesh;
        let release: () => void;

        if (path.endsWith(".glb")) {
            const container = await LoadAssetContainerAsync(object.source, scene);
            container.addAllToScene();
            mesh = container.meshes[0];
            mesh.position.set(object.x, object.y, object.z);
            if (object.scale !== undefined) mesh.scaling.scaleInPlace(object.scale);
            if (object.highlight !== undefined) {
                container.meshes.forEach((part) => {
                    part.metadata = { ...part.metadata, highlightMode: object.highlight };
                });
            }
            release = () => {
                container.removeAllFromScene();
                container.dispose();
            };
        } else {
            const width = object.width ?? PLANE_WIDTH;
            const height = object.height ?? PLANE_HEIGHT;
            const plane = MeshBuilder.CreatePlane(object.source, { width, height }, scene);
            plane.position.set(object.x, object.y, object.z);
            mesh = plane;

            if (path.endsWith(".mp4")) {
                const videoTexture = new VideoTexture(
                    `${object.source}VideoTex`,
                    object.source,
                    scene,
                    false,
                    false,
                    undefined,
                    { autoPlay: true, loop: true, muted: true },
                    videoTextureOnError,
                );
                const videoElement = videoTexture.video;
                videoElement.playsInline = true;
                videoElement.setAttribute("playsinline", "");
                videoElement.setAttribute("webkit-playsinline", "");
                applyPlaneMaterial(plane, videoTexture, scene, { width, height, highlight: object.highlight });
                release = () => {
                    videoTexture.dispose();
                    plane.dispose(false, true);
                };
            } else {
                const texture = new Texture(
                    object.source,
                    scene,
                    false,
                    true,
                    Texture.TRILINEAR_SAMPLINGMODE,
                    undefined,
                    (message) => console.warn(`[objectManager] Failed to load ${object.source}: ${message}`),
                );
                texture.hasAlpha = true;
                applyPlaneMaterial(plane, texture, scene, { width, height, highlight: object.highlight });
                release = () => plane.dispose(false, true);
            }
        }

        if (object.rx) mesh.rotate(Axis.X, object.rx, Space.LOCAL);
        if (object.ry) mesh.rotate(Axis.Y, object.ry, Space.LOCAL);
        if (object.rz) mesh.rotate(Axis.Z, object.rz, Space.LOCAL);

        for (const part of [mesh, ...mesh.getChildMeshes()]) {
            part.isPickable = false;
        }
        mesh.metadata = { ...mesh.metadata, exhibitDispose: release };

        if (object.modal?.length || object.subtitle || object.targetScene || object.highlight) {
            this.interactive(mesh, {
                onClick: () => {
                    subtitleManager.hide();
                    if (object.modal?.length) this.openModal(object);
                    else if (object.targetScene) sceneManager.switchTo(object.targetScene);
                },
                onHover: () => object.subtitle && subtitleManager.show(object.subtitle),
                onHoverEnd: () => subtitleManager.hide(),
            });
        }

        return mesh;
    }

    applyVideoTexture(
        mesh: AbstractMesh,
        source: string,
        highlight: HighlightMode | undefined,
        options: { invertY?: boolean } = {},
    ): VideoTexture {
        if (!this.scene) throw new Error("objectManager.init(scene) must be called first");
        const videoTexture = new VideoTexture(
            `${mesh.name}VideoTex`,
            source,
            this.scene,
            false,
            options.invertY ?? true,
            undefined,
            { autoPlay: true, loop: true, muted: true },
            videoTextureOnError,
        );
        const videoElement = videoTexture.video;
        videoElement.playsInline = true;
        videoElement.setAttribute("playsinline", "");
        videoElement.setAttribute("webkit-playsinline", "");
        applyPlaneMaterial(mesh, videoTexture, this.scene, { highlight });
        return videoTexture;
    }

    applyMappedVideoTextures(
        mesh: AbstractMesh,
        meshVideos: Record<string, string>,
        options: { invertY?: boolean } = {},
    ): AbstractMesh {
        const highlight = mesh.metadata?.highlightMode as HighlightMode | undefined;
        const textures: VideoTexture[] = [];
        for (const part of [mesh, ...mesh.getChildMeshes()]) {
            const source = meshVideos[part.name];
            if (source) textures.push(this.applyVideoTexture(part, source, highlight, options));
        }
        const release = mesh.metadata.exhibitDispose as () => void;
        mesh.metadata.exhibitDispose = () => {
            textures.forEach((texture) => texture.dispose());
            release();
        };
        return mesh;
    }
}

export const objectManager = new ObjectManager();
