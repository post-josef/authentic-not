import {
    Color3,
    HemisphericLight,
    Light,
    MeshBuilder,
    PointLight,
    Quaternion,
    SpotLight,
    StandardMaterial,
    Vector3,
} from "@babylonjs/core";
import type { AbstractMesh, Mesh, Scene } from "@babylonjs/core";

export interface LightOptions {
    x: number;
    y: number;
    z: number;
    target?: Vector3; // if target is provided, the light will be a spot light
    color?: Color3;
    intensity?: number; // default is 50
    range?: number; // default is 50
    meshes?: AbstractMesh[];
    fixture?: { scale?: number }; // default is 0.5
}

function createFixtureMaterial(name: string, scene: Scene, color: Color3): StandardMaterial {
    const material = new StandardMaterial(`${name}Material`, scene);
    material.emissiveColor = color.clone();
    material.disableLighting = true;
    material.alpha = 0.8;
    return material;
}

function createPointFixture(name: string, position: Vector3, scene: Scene, color: Color3, scale = 0.3): Mesh {
    const fixture = MeshBuilder.CreateSphere(`${name}Fixture`, { diameter: scale, segments: 8 }, scene);
    fixture.position.copyFrom(position);
    fixture.material = createFixtureMaterial(name, scene, color);
    fixture.isPickable = false;
    return fixture;
}

function createSpotFixture(
    name: string,
    position: Vector3,
    direction: Vector3,
    scene: Scene,
    color: Color3,
    scale = 0.5,
): Mesh {
    const fixture = MeshBuilder.CreateCylinder(
        `${name}Fixture`,
        {
            diameterTop: 0,
            diameterBottom: scale * 0.7,
            height: scale,
            tessellation: 8,
        },
        scene,
    );
    fixture.position.copyFrom(position);
    fixture.material = createFixtureMaterial(name, scene, color);
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

export class LightManager {
    private scene: Scene | null = null;
    private globalLight: HemisphericLight | null = null;

    init(scene: Scene) {
        this.dispose();
        this.scene = scene;
        this.globalLight = new HemisphericLight("globalFill", Vector3.Up(), scene);
        this.globalLight.intensity = 0.1;
        this.globalLight.diffuse = new Color3(0.45, 0.48, 0.55);
        this.globalLight.groundColor = new Color3(0.06, 0.06, 0.08);
    }

    createLight(options: LightOptions): PointLight | SpotLight {
        if (!this.scene) throw new Error("lightManager.init(scene) must be called first");
        const scene = this.scene;
        const name = `light${scene.lights.length}`;
        const position = new Vector3(options.x, options.y, options.z);
        const color = options.color ?? new Color3(1, 0.99, 0.98);

        const light = options.target
            ? new SpotLight(name, position, options.target.subtract(position).normalize(), Math.PI / 2.4, 1.15, scene)
            : new PointLight(name, position, scene);
        if (light instanceof SpotLight) light.innerAngle = Math.PI / 11;

        light.falloffType = Light.FALLOFF_GLTF;
        light.diffuse = color.clone();
        light.specular = color.clone();
        light.intensity = options.intensity ?? 50;
        light.range = options.range ?? 50;
        if (options.meshes) {
            const lit = new Set<AbstractMesh>();
            for (const root of options.meshes) {
                lit.add(root);
                root.getChildMeshes().forEach((child) => lit.add(child));
            }
            light.includedOnlyMeshes = [...lit];
        }

        if (options.fixture) {
            const scale = options.fixture.scale;
            if (light instanceof SpotLight) {
                createSpotFixture(name, position, light.direction, scene, color, scale ?? 0.5);
            } else {
                createPointFixture(name, position, scene, color, scale ?? 0.3);
            }
        }

        return light;
    }

    clear() {
        if (!this.scene || !this.globalLight) return;
        for (const light of [...this.scene.lights]) {
            if (light !== this.globalLight) light.dispose();
        }
    }

    dispose() {
        this.clear();
        this.globalLight?.dispose();
        this.globalLight = null;
        this.scene = null;
    }
}

export const lightManager = new LightManager();
