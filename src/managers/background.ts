import { CubeTexture, HDRCubeTexture, type BaseTexture, type Mesh, type Scene } from "@babylonjs/core";

export interface EnvironmentOptions {
    intensity?: number;
    rotation?: number;
    size?: number;
    blur?: number;
}

const DEFAULTS: Required<EnvironmentOptions> = {
    intensity: 1,
    rotation: 0,
    size: 1000,
    blur: 0,
};

export class BackgroundManager {
    private scene: Scene | null = null;
    private environment: BaseTexture | null = null;
    private background: Mesh | null = null;

    init(scene: Scene): void {
        this.dispose();
        this.scene = scene;
    }

    setEnvironment(file: string, options: EnvironmentOptions = {}): BaseTexture {
        this.clear();
        const scene = this.requireScene();
        const extension = file.split(/[?#]/, 1)[0].toLowerCase();
        if (!extension.endsWith(".env") && !extension.endsWith(".hdr")) {
            throw new Error(`Unsupported environment file: ${file}`);
        }

        const texture = extension.endsWith(".hdr")
            ? new HDRCubeTexture(file, scene, 512, false, true, false, true)
            : CubeTexture.CreateFromPrefilteredData(file, scene);

        texture.rotationY = options.rotation ?? DEFAULTS.rotation;
        scene.environmentTexture = texture;
        scene.environmentIntensity = options.intensity ?? DEFAULTS.intensity;
        this.environment = texture;
        this.background = scene.createDefaultSkybox(
            texture,
            true,
            options.size ?? DEFAULTS.size,
            options.blur ?? DEFAULTS.blur,
            false,
        );

        return texture;
    }

    clear(): void {
        this.background?.dispose(false, true);
        this.background = null;

        if (this.scene?.environmentTexture === this.environment) {
            this.scene.environmentTexture = null;
            this.scene.environmentIntensity = 1;
        }
        this.environment?.dispose();
        this.environment = null;
    }

    dispose(): void {
        this.clear();
        this.scene = null;
    }

    private requireScene(): Scene {
        if (!this.scene) throw new Error("backgroundManager.init(scene) must be called first");
        return this.scene;
    }
}

export const backgroundManager = new BackgroundManager();
