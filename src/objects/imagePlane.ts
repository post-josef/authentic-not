import {
    MeshBuilder,
    StandardMaterial,
    Color3,
    Texture,
    Material,
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
}

export function createImagePlane(
    scene: Scene,
    data: ImagePlaneData,
    highlightMode: HighlightMode,
): SceneObject {
    const plane = MeshBuilder.CreatePlane(data.title, { width: PLANE_WIDTH, height: PLANE_HEIGHT }, scene);
    plane.position.set(data.x, data.y ?? 1.8, data.z ?? 5);
    plane.rotation.y = data.r;

    const texture = new Texture(data.img, scene);
    texture.hasAlpha = true;
    if (highlightMode !== "border") {
        texture.updateSamplingMode(Texture.TRILINEAR_SAMPLINGMODE);
    }

    const mat = new StandardMaterial(`${data.title}Mat`, scene);
    mat.diffuseTexture = texture;
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.backFaceCulling = false;
    if (highlightMode === "border") {
        mat.opacityTexture = texture;
    } else {
        mat.useAlphaFromDiffuseTexture = true;
        mat.transparencyMode =
            highlightMode === "selectionOutline"
                ? Material.MATERIAL_ALPHATESTANDBLEND
                : Material.MATERIAL_ALPHATEST;
        mat.alphaCutOff = 0.4;
    }
    plane.material = mat;

    if (highlightMode === "border") {
        const border = MeshBuilder.CreatePlane(
            `${data.title}Border`,
            { width: PLANE_WIDTH + BORDER_WIDTH * 2, height: PLANE_HEIGHT + BORDER_WIDTH * 2 },
            scene,
        );
        border.parent = plane;
        border.position.z = -0.005;
        border.isVisible = false;
        border.isPickable = false;

        const borderMat = new StandardMaterial(`${data.title}BorderMat`, scene);
        borderMat.emissiveColor = Color3.White();
        borderMat.disableLighting = true;
        border.material = borderMat;
        border.renderingGroupId = 0;
        plane.renderingGroupId = 1;
        plane.metadata = { border };
    }

    return {
        mesh: plane,
        dispose() {
            plane.dispose(false, true);
        },
    };
}
