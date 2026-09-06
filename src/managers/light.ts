import {
    Color3,
    DirectionalLight,
    HemisphericLight,
    Light,
    MeshBuilder,
    PointLight,
    Quaternion,
    SpotLight,
    StandardMaterial,
    Vector3,
    type AbstractMesh,
    type Mesh,
    type Scene,
} from "@babylonjs/core";

export type Vec3 = [number, number, number];
export type Color3Value = [number, number, number];

interface LightFixtureOptions {
    scale?: number;
    color?: [number, number, number];
}

function createFixtureMaterial(
    name: string,
    scene: Scene,
    color: [number, number, number],
): StandardMaterial {
    const material = new StandardMaterial(`${name}Material`, scene);
    material.emissiveColor = new Color3(...color);
    material.disableLighting = true;
    return material;
}

function createPointFixture(
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
    fixture.material = createFixtureMaterial(name, scene, options.color ?? [1, 0.9, 0.6]);
    fixture.isPickable = false;
    return fixture;
}

function createDirectionalFixture(
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
    fixture.material = createFixtureMaterial(name, scene, options.color ?? [1, 0.9, 0.6]);
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

interface CommonLightOptions {
    intensity?: number;
    diffuse?: Color3Value;
    specular?: Color3Value;
    includedOnlyMeshes?: AbstractMesh[];
}

export interface PointLightOptions extends CommonLightOptions {
    range?: number;
    showFixture?: boolean;
    fixture?: LightFixtureOptions;
}

export interface SpotLightOptions extends CommonLightOptions {
    target?: Vec3;
    direction?: Vec3;
    angle?: number;
    innerAngle?: number;
    exponent?: number;
    range?: number;
    showFixture?: boolean;
    fixture?: LightFixtureOptions;
}

export interface DirectionalLightOptions extends CommonLightOptions {
    position?: Vec3;
    showFixture?: boolean;
    fixture?: LightFixtureOptions;
}

interface TrackedLight {
    light: Light;
    fixture: AbstractMesh | null;
}

export class LightManager {
    private scene: Scene | null = null;
    private globalLight: HemisphericLight | null = null;
    private tracked: TrackedLight[] = [];

    init(scene: Scene): void {
        this.dispose();
        this.scene = scene;
        this.globalLight = new HemisphericLight("globalFill", Vector3.Up(), scene);
        this.globalLight.intensity = 0.1;
        this.globalLight.diffuse = new Color3(0.45, 0.48, 0.55);
        this.globalLight.groundColor = new Color3(0.06, 0.06, 0.08);
    }

    createHemispheric(
        name: string,
        direction: Vec3 = [0, 1, 0],
        options: CommonLightOptions & { groundColor?: Color3Value } = {},
    ): HemisphericLight {
        const light = new HemisphericLight(name, new Vector3(...direction), this.requireScene());
        this.applyCommon(light, options);
        if (options.groundColor) light.groundColor = new Color3(...options.groundColor);
        return this.track(light);
    }

    createPoint(name: string, position: Vec3, options: PointLightOptions = {}): PointLight {
        const scene = this.requireScene();
        const vector = new Vector3(...position);
        const light = new PointLight(name, vector, scene);
        this.applyCommon(light, options);
        if (options.range !== undefined) light.range = options.range;
        const fixture =
            options.showFixture === false
                ? null
                : createPointFixture(name, vector, scene, {
                      color: options.fixture?.color ?? options.diffuse,
                      ...options.fixture,
                  });
        this.tracked.push({ light, fixture });
        return light;
    }

    createSpot(name: string, position: Vec3, options: SpotLightOptions = {}): SpotLight {
        const scene = this.requireScene();
        const source = new Vector3(...position);
        const direction = options.target
            ? new Vector3(...options.target).subtract(source).normalize()
            : new Vector3(...(options.direction ?? [0, -1, 0])).normalize();
        const light = new SpotLight(
            name,
            source,
            direction,
            options.angle ?? Math.PI / 2.4,
            options.exponent ?? 1.15,
            scene,
        );
        this.applyCommon(light, options);
        light.falloffType = Light.FALLOFF_GLTF;
        light.innerAngle = options.innerAngle ?? Math.PI / 11;
        if (options.range !== undefined) light.range = options.range;
        const fixture =
            options.showFixture === false
                ? null
                : createDirectionalFixture(name, source, direction, scene, {
                      color: options.fixture?.color ?? options.diffuse,
                      ...options.fixture,
                  });
        this.tracked.push({ light, fixture });
        return light;
    }

    createDirectional(
        name: string,
        direction: Vec3,
        options: DirectionalLightOptions = {},
    ): DirectionalLight {
        const scene = this.requireScene();
        const vector = new Vector3(...direction).normalize();
        const light = new DirectionalLight(name, vector, scene);
        this.applyCommon(light, options);
        if (options.position) light.position = new Vector3(...options.position);
        const fixture =
            options.showFixture && options.position
                ? createDirectionalFixture(
                      name,
                      new Vector3(...options.position),
                      vector,
                      scene,
                      { color: options.fixture?.color ?? options.diffuse, ...options.fixture },
                  )
                : null;
        this.tracked.push({ light, fixture });
        return light;
    }

    track<T extends Light>(light: T, fixture: AbstractMesh | null = null): T {
        this.tracked.push({ light, fixture });
        return light;
    }

    get(name: string): Light | undefined {
        return this.tracked.find(({ light }) => light.name === name)?.light;
    }

    clear(): void {
        this.tracked.forEach(({ light, fixture }) => {
            fixture?.dispose(false, true);
            light.dispose();
        });
        this.tracked = [];
    }

    dispose(): void {
        this.clear();
        this.globalLight?.dispose();
        this.globalLight = null;
        this.scene = null;
    }

    private requireScene(): Scene {
        if (!this.scene) throw new Error("lightManager.init(scene) must be called first");
        return this.scene;
    }

    private applyCommon(light: Light, options: CommonLightOptions): void {
        light.intensity = options.intensity ?? 1;
        if (options.diffuse) light.diffuse = new Color3(...options.diffuse);
        if (options.specular) light.specular = new Color3(...options.specular);
        if (options.includedOnlyMeshes) light.includedOnlyMeshes = options.includedOnlyMeshes;
    }
}

export const lightManager = new LightManager();
