import { Color3, Light, SpotLight, Vector3, type Scene } from "@babylonjs/core";
import type { AbstractMesh } from "@babylonjs/core";

export const SOFT_SPOT_OUTER_ANGLE = Math.PI / 2.4;
export const SOFT_SPOT_INNER_ANGLE = Math.PI / 11;
export const SOFT_SPOT_EXPONENT = 1.15;

export function createSoftRedSpotLight(
    name: string,
    position: Vector3,
    direction: Vector3,
    scene: Scene,
    meshes: AbstractMesh[],
): SpotLight {
    const spot = new SpotLight(name, position, direction.normalize(), SOFT_SPOT_OUTER_ANGLE, SOFT_SPOT_EXPONENT, scene);
    spot.diffuse = new Color3(1, 0.32, 0.32);
    spot.specular = new Color3(1, 0.35, 0.35);
    spot.intensity = 1.2;
    spot.range = 14;
    spot.falloffType = Light.FALLOFF_GLTF;
    spot.innerAngle = SOFT_SPOT_INNER_ANGLE;
    spot.includedOnlyMeshes = meshes;
    return spot;
}
