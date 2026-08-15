import {
    Color3,
    MeshBuilder,
    Quaternion,
    StandardMaterial,
    Vector3,
    type Mesh,
    type Scene,
} from "@babylonjs/core";

export interface LightFixtureOptions {
    scale?: number;
    color?: [number, number, number];
    /** Reserved for the real fixture asset when it is supplied. */
    modelUrl?: string;
}

function createMaterial(
    name: string,
    scene: Scene,
    color: [number, number, number],
): StandardMaterial {
    const material = new StandardMaterial(`${name}Material`, scene);
    material.emissiveColor = new Color3(...color);
    material.disableLighting = true;
    return material;
}

export function createPointFixture(
    name: string,
    position: Vector3,
    scene: Scene,
    options: LightFixtureOptions = {},
): Mesh {
    const fixture = MeshBuilder.CreateSphere(
        `${name}Fixture`,
        { diameter: options.scale ?? 0.3, segments: 8 },
        scene,
    );
    fixture.position.copyFrom(position);
    fixture.material = createMaterial(name, scene, options.color ?? [1, 0.9, 0.6]);
    fixture.isPickable = false;
    return fixture;
}

export function createDirectionalFixture(
    name: string,
    position: Vector3,
    direction: Vector3,
    scene: Scene,
    options: LightFixtureOptions = {},
): Mesh {
    const size = options.scale ?? 0.5;
    const fixture = MeshBuilder.CreateCylinder(
        `${name}Fixture`,
        {
            diameterTop: 0,
            diameterBottom: size * 0.7,
            height: size,
            tessellation: 8,
        },
        scene,
    );
    fixture.position.copyFrom(position);
    fixture.material = createMaterial(name, scene, options.color ?? [1, 0.9, 0.6]);
    fixture.isPickable = false;

    const from = Vector3.Down();
    const normalized = direction.normalize();
    const dot = Math.max(-1, Math.min(1, Vector3.Dot(from, normalized)));
    const axis = Vector3.Cross(from, normalized);
    fixture.rotationQuaternion =
        axis.lengthSquared() < 0.000001
            ? dot > 0
                ? Quaternion.Identity()
                : Quaternion.RotationAxis(Vector3.Right(), Math.PI)
            : Quaternion.RotationAxis(axis.normalize(), Math.acos(dot));
    return fixture;
}
