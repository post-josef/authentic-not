import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import {
    Color3,
    Material,
    MeshBuilder,
    StandardMaterial,
    Texture,
    VideoTexture,
    type AbstractMesh,
    type BaseTexture,
    type Scene,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import type { HighlightMode, Object3D, SceneObject } from "../types";
import { highlightManager } from "./highlight";
import { modalManager } from "./modal";
import { sceneManager } from "./scene";
import { subtitleManager } from "./subtitle";

const PLANE_WIDTH = 2.3;
const PLANE_HEIGHT = 3.2;
const BORDER_WIDTH = 0.04;

function videoTextureOnError(message?: string): void {
    if (message?.includes("interrupted")) return;
    console.warn(`[objectManager] ${message ?? "Video texture error"}`);
}

function applyPlaneMaterial(
    mesh: AbstractMesh,
    texture: BaseTexture,
    scene: Scene,
    options: { width?: number; height?: number; frameOverlay?: boolean; highlight?: HighlightMode } = {},
): void {
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
    meshes(object: SceneObject): AbstractMesh[] {
        return [object.mesh, ...object.mesh.getChildMeshes()];
    }

    setPickable(object: SceneObject, pickable: boolean): void {
        for (const mesh of this.meshes(object)) mesh.isPickable = pickable;
    }

    applyMappedVideoTextures(
        object: SceneObject,
        meshVideos: Record<string, string>,
        options: { invertY?: boolean } = {},
    ): SceneObject {
        const highlight = (object.mesh.metadata?.highlightMode as HighlightMode | undefined) ?? undefined;
        const textures: VideoTexture[] = [];
        for (const mesh of this.meshes(object)) {
            const source = meshVideos[mesh.name];
            if (source) textures.push(this.applyVideoTexture(mesh, source, highlight, options));
        }
        const disposeObject = object.dispose.bind(object);
        return {
            mesh: object.mesh,
            dispose: () => {
                textures.forEach((texture) => texture.dispose());
                disposeObject();
            },
        };
    }

    interactive(
        object: SceneObject,
        events: {
            onClick: () => void;
            onHover?: () => void;
            onHoverEnd?: () => void;
        },
    ): void {
        const config = {
            isInteractionBlocked: () => modalManager.isOpen(),
            onPick: events.onClick,
            onPointerOver: events.onHover,
            onPointerOut: events.onHoverEnd,
        };
        for (const mesh of this.meshes(object)) {
            if (mesh.name.endsWith("Border")) continue;
            highlightManager.makeInteractive(mesh, config);
        }
    }

    openModal(object: Object3D, hooks: { onSceneSwitch?: (sceneId: string) => void } = {}): void {
        if (!object.modal?.length) return;
        modalManager.open({
            pickableMeshes: sceneManager.getMeshes(),
            className: object.modalClassName,
            content: object.modal,
            onSceneSwitch: (sceneId) => {
                hooks.onSceneSwitch?.(sceneId);
                sceneManager.switchTo(sceneId);
            },
        });
    }

    async create(object: Object3D): Promise<SceneObject> {
        const scene = sceneManager.getBabylonScene();
        const path = object.source.split(/[?#]/, 1)[0].toLowerCase();
        let sceneObject: SceneObject;

        if (path.endsWith(".glb")) {
            const container = await LoadAssetContainerAsync(object.source, scene);
            container.addAllToScene();
            const root = container.meshes[0];
            root.position.set(object.x, object.y, object.z);
            root.rotation.set(object.rx ?? 0, object.ry ?? 0, object.rz ?? 0);
            if (object.scale !== undefined) root.scaling.set(object.scale, object.scale, object.scale);
            root.isPickable = false;
            if (object.highlight !== undefined) {
                container.meshes.forEach((mesh) => {
                    mesh.metadata = { ...mesh.metadata, highlightMode: object.highlight };
                });
            }
            sceneObject = {
                mesh: root,
                dispose: () => {
                    container.removeAllFromScene();
                    container.dispose();
                },
            };
        } else {
            const width = object.width ?? PLANE_WIDTH;
            const height = object.height ?? PLANE_HEIGHT;
            const plane = MeshBuilder.CreatePlane(object.id, { width, height }, scene);
            plane.position.set(object.x, object.y, object.z);
            plane.rotation.set(object.rx ?? 0, object.ry ?? 0, object.rz ?? 0);
            plane.isPickable = false;

            if (path.endsWith(".mp4")) {
                const videoTexture = new VideoTexture(
                    `${object.id}VideoTex`,
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
                sceneObject = {
                    mesh: plane,
                    dispose: () => {
                        videoTexture.dispose();
                        plane.dispose(false, true);
                    },
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
                sceneObject = {
                    mesh: plane,
                    dispose: () => plane.dispose(false, true),
                };
            }
        }

        if (object.modal?.length || object.highlight !== undefined) {
            this.interactive(sceneObject, {
                onClick: () => {
                    subtitleManager.hide();
                    if (object.modal?.length) this.openModal(object);
                },
                onHover: () => object.subtitle && subtitleManager.show(object.subtitle),
                onHoverEnd: () => subtitleManager.hide(),
            });
        }

        return sceneObject;
    }

    applyVideoTexture(
        mesh: AbstractMesh,
        source: string,
        highlight: HighlightMode | undefined,
        options: { invertY?: boolean } = {},
    ): VideoTexture {
        const scene = sceneManager.getBabylonScene();
        const videoTexture = new VideoTexture(
            `${mesh.name}VideoTex`,
            source,
            scene,
            false,
            options.invertY ?? false,
            undefined,
            { autoPlay: true, loop: true, muted: true },
            videoTextureOnError,
        );
        const videoElement = videoTexture.video;
        videoElement.playsInline = true;
        videoElement.setAttribute("playsinline", "");
        videoElement.setAttribute("webkit-playsinline", "");
        applyPlaneMaterial(mesh, videoTexture, scene, { highlight });

        return videoTexture;
    }
}

export const objectManager = new ObjectManager();
