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
import type { GalleryItem, HighlightMode, SceneObject } from "../types";
import { highlightManager } from "./highlight";
import { modalManager } from "./modal";
import { sceneManager } from "./scene";

const PLANE_WIDTH = 2.3;
const PLANE_HEIGHT = 3.2;
const BORDER_WIDTH = 0.04;

export function isImageSource(source: string): boolean {
    return /\.(png|jpe?g|gif|webp)$/i.test(source.split(/[?#]/, 1)[0]);
}

function applyPlaneMaterial(
    mesh: AbstractMesh,
    texture: BaseTexture,
    highlightMode: HighlightMode,
    scene: Scene,
    options: { width?: number; height?: number; frameOverlay?: boolean } = {},
): void {
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
            highlightMode === "selectionOutline" ? Material.MATERIAL_ALPHATESTANDBLEND : Material.MATERIAL_ALPHATEST;
        material.alphaCutOff = 0.4;
    }

    mesh.material = material;
    mesh.metadata = { ...mesh.metadata, highlightMode };

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
    mesh.metadata = { ...mesh.metadata, highlightMode, border };
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
        highlightMode: HighlightMode,
        options: { invertY?: boolean } = {},
    ): SceneObject {
        const textures: VideoTexture[] = [];
        for (const mesh of this.meshes(object)) {
            const source = meshVideos[mesh.name];
            if (source) textures.push(this.applyVideoTexture(mesh, source, highlightMode, options));
        }
        const disposeObject = object.dispose.bind(object);
        return {
            mesh: object.mesh,
            dispose: () => {
                textures.forEach((texture) => this.disposeVideoTexture(texture));
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

    async create(item: GalleryItem, defaultHighlightMode: HighlightMode): Promise<SceneObject> {
        const highlightMode = item.highlight ?? defaultHighlightMode;
        const scene = sceneManager.getBabylonScene();

        if (item.source.split(/[?#]/, 1)[0].toLowerCase().endsWith(".glb")) {
            const container = await LoadAssetContainerAsync(item.source, scene);
            container.addAllToScene();
            const root = container.meshes[0];
            root.position.set(item.x, item.y ?? 1.8, item.z ?? 5);
            root.rotation.y = item.r ?? 0;
            if (item.scale !== undefined) root.scaling.set(item.scale, item.scale, item.scale);
            root.isPickable = false;
            container.meshes.forEach((mesh) => {
                mesh.metadata = { ...mesh.metadata, highlightMode };
            });
            return {
                mesh: root,
                dispose: () => {
                    container.removeAllFromScene();
                    container.dispose();
                },
            };
        }

        const width = item.width ?? PLANE_WIDTH;
        const height = item.height ?? PLANE_HEIGHT;
        const plane = MeshBuilder.CreatePlane(item.id, { width, height }, scene);
        plane.position.set(item.x, item.y ?? 1.8, item.z ?? 5);
        plane.rotation.y = item.r ?? 0;
        plane.isPickable = false;

        const texture = new Texture(
            item.source,
            scene,
            false,
            true,
            Texture.TRILINEAR_SAMPLINGMODE,
            undefined,
            (message) => console.warn(`[objectManager] Failed to load ${item.source}: ${message}`),
        );
        texture.hasAlpha = true;
        applyPlaneMaterial(plane, texture, highlightMode, scene, { width, height });

        return {
            mesh: plane,
            dispose: () => plane.dispose(false, true),
        };
    }

    applyVideoTexture(
        mesh: AbstractMesh,
        source: string,
        highlightMode: HighlightMode,
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
            {
                autoPlay: true,
                loop: true,
                muted: true,
            },
        );
        const videoElement = videoTexture.video;
        videoElement.playsInline = true;
        videoElement.setAttribute("playsinline", "");
        videoElement.setAttribute("webkit-playsinline", "");
        applyPlaneMaterial(mesh, videoTexture, highlightMode, scene);

        void videoElement
            .play()
            ?.catch((error) => console.warn(`[objectManager] Autoplay blocked for ${source}`, error));

        return videoTexture;
    }

    disposeVideoTexture(videoTexture: VideoTexture): void {
        const videoElement = videoTexture.video;
        videoElement.pause();
        videoElement.removeAttribute("src");
        videoElement.load();
        videoTexture.dispose();
    }

    createVideoPanel(
        item: {
            title: string;
            source: string;
            x: number;
            y: number;
            z: number;
            width: number;
            height: number;
            frame?: {
                source: string;
                width: number;
                height: number;
                videoOffsetX?: number;
                videoOffsetY?: number;
            };
        },
        highlightMode: HighlightMode,
    ): SceneObject {
        const scene = sceneManager.getBabylonScene();
        const host = item.frame
            ? MeshBuilder.CreatePlane(
                  `${item.title}Frame`,
                  { width: item.frame.width, height: item.frame.height },
                  scene,
              )
            : MeshBuilder.CreatePlane(item.title, { width: item.width, height: item.height }, scene);
        host.position.set(item.x, item.y, item.z);
        host.isPickable = false;

        const video = item.frame
            ? MeshBuilder.CreatePlane(`${item.title}Video`, { width: item.width, height: item.height }, scene)
            : host;
        if (item.frame) {
            video.parent = host;
            video.position.set(item.frame.videoOffsetX ?? 0, item.frame.videoOffsetY ?? 0, -0.001);
            video.isPickable = false;

            const frameTexture = new Texture(
                item.frame.source,
                scene,
                false,
                true,
                Texture.TRILINEAR_SAMPLINGMODE,
                undefined,
                (message) => console.warn(`[objectManager] Failed to load ${item.frame?.source}: ${message}`),
            );
            frameTexture.hasAlpha = true;
            applyPlaneMaterial(host, frameTexture, highlightMode, scene, { frameOverlay: true });
        }

        const videoTexture = new VideoTexture(`${item.title}VideoTex`, item.source, scene, false, false, undefined, {
            autoPlay: true,
            loop: true,
            muted: true,
        });
        const videoElement = videoTexture.video;
        videoElement.playsInline = true;
        videoElement.setAttribute("playsinline", "");
        videoElement.setAttribute("webkit-playsinline", "");
        applyPlaneMaterial(video, videoTexture, highlightMode, scene, {
            width: item.width,
            height: item.height,
        });

        void videoElement
            .play()
            ?.catch((error) => console.warn(`[objectManager] Autoplay blocked for ${item.source}`, error));

        return {
            mesh: host,
            dispose: () => {
                videoElement.pause();
                videoElement.removeAttribute("src");
                videoElement.load();
                videoTexture.dispose();
                host.dispose(false, true);
            },
        };
    }
}

export const objectManager = new ObjectManager();
