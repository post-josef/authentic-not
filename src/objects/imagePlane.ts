import {
    Color3,
    Material,
    MeshBuilder,
    StandardMaterial,
    Texture,
    type Scene,
} from "@babylonjs/core";
import type { HighlightMode } from "../managers/highlight";
import type { SceneObject } from "./sceneObject";

export const PLANE_WIDTH = 2.3;
export const PLANE_HEIGHT = 3.2;
export const BORDER_WIDTH = 0.04;

export interface ImagePlaneData {
    title: string;
    img: string;
    x: number;
    y?: number;
    z?: number;
    r: number;
    width?: number;
    height?: number;
}

export function createImagePlane(
    scene: Scene,
    data: ImagePlaneData,
    highlightMode: HighlightMode,
): SceneObject {
    const width = data.width ?? PLANE_WIDTH;
    const height = data.height ?? PLANE_HEIGHT;
    const plane = MeshBuilder.CreatePlane(data.title, { width, height }, scene);
    plane.position.set(data.x, data.y ?? 1.8, data.z ?? 5);
    plane.rotation.y = data.r;
    plane.isPickable = false;

    const texture = new Texture(
        data.img,
        scene,
        false,
        true,
        Texture.TRILINEAR_SAMPLINGMODE,
        undefined,
        (message) => console.warn(`[imagePlane] Failed to load ${data.img}: ${message}`),
    );
    texture.hasAlpha = true;

    const material = new StandardMaterial(`${data.title}Mat`, scene);
    material.diffuseTexture = texture;
    material.emissiveColor = Color3.White();
    material.backFaceCulling = false;
    if (highlightMode === "border") {
        material.opacityTexture = texture;
    } else {
        material.useAlphaFromDiffuseTexture = true;
        material.transparencyMode =
            highlightMode === "selectionOutline"
                ? Material.MATERIAL_ALPHATESTANDBLEND
                : Material.MATERIAL_ALPHATEST;
        material.alphaCutOff = 0.4;
    }
    plane.material = material;

    if (highlightMode === "border") {
        const border = MeshBuilder.CreatePlane(
            `${data.title}Border`,
            { width: width + BORDER_WIDTH * 2, height: height + BORDER_WIDTH * 2 },
            scene,
        );
        border.parent = plane;
        border.position.z = -0.005;
        border.isVisible = false;
        border.isPickable = false;
        const borderMaterial = new StandardMaterial(`${data.title}BorderMat`, scene);
        borderMaterial.emissiveColor = Color3.White();
        borderMaterial.disableLighting = true;
        border.material = borderMaterial;
        border.renderingGroupId = 0;
        plane.renderingGroupId = 1;
        plane.metadata = { border };
    }

    return {
        mesh: plane,
        dispose: () => plane.dispose(false, true),
    };
}
