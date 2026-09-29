import { CubeTexture, HDRCubeTexture } from "@babylonjs/core";
import type { BaseTexture, Mesh, Scene } from "@babylonjs/core";

export const DEFAULT_ENVIRONMENT_URL =
    "https://assets.babylonjs.com/environments/environmentSpecular.env";

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
    private environmentUrl: string | null = null;
    private background: Mesh | null = null;

    init(scene: Scene) {
        this.dispose();
        this.scene = scene;
    }

    /** Shared IBL for PBR materials (no skybox); kept across scene switches. */
    setReflections(file: string, options: EnvironmentOptions = {}): BaseTexture {
        const scene = this.requireScene();
        if (!this.environment || this.environmentUrl !== file) {
            this.environment?.dispose();
            this.environment = this.createEnvironmentTexture(file, scene);
            this.environmentUrl = file;
        }
        this.applyEnvironmentSettings(scene, options);
        return this.environment;
    }

    setSkybox(file: string, options: EnvironmentOptions = {}): BaseTexture {
        this.clearSkybox();
        const scene = this.requireScene();
        const texture = this.setReflections(file, options);
        this.background = scene.createDefaultSkybox(
            texture,
            true,
            options.size ?? DEFAULTS.size,
            options.blur ?? DEFAULTS.blur,
            false,
        );
        return texture;
    }

    clear() {
        this.clearSkybox();
    }

    dispose() {
        this.clearSkybox();
        const scene = this.scene;
        const environment = this.environment;
        this.environment = null;
        this.environmentUrl = null;
        this.scene = null;
        if (scene?.environmentTexture === environment) {
            scene.environmentTexture = null;
            scene.environmentIntensity = 1;
        }
        environment?.dispose();
    }

    private clearSkybox() {
        this.background?.dispose(false, true);
        this.background = null;
    }

    private createEnvironmentTexture(file: string, scene: Scene): BaseTexture {
        const extension = file.split(/[?#]/, 1)[0].toLowerCase();
        if (!extension.endsWith(".env") && !extension.endsWith(".hdr")) {
            throw new Error(`Unsupported environment file: ${file}`);
        }
        return extension.endsWith(".hdr")
            ? new HDRCubeTexture(file, scene, 512, false, true, false, true)
            : CubeTexture.CreateFromPrefilteredData(file, scene);
    }

    private applyEnvironmentSettings(scene: Scene, options: EnvironmentOptions) {
        if (!this.environment) return;
        (this.environment as CubeTexture).rotationY = options.rotation ?? DEFAULTS.rotation;
        scene.environmentTexture = this.environment;
        scene.environmentIntensity = options.intensity ?? DEFAULTS.intensity;
    }

    private requireScene(): Scene {
        if (!this.scene) throw new Error("backgroundManager.init(scene) must be called first");
        return this.scene;
    }
}

export const backgroundManager = new BackgroundManager();
