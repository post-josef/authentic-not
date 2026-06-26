import { HemisphericLight, Vector3, Color3, type Light, type Scene } from "@babylonjs/core";

export class LightManager {
    private readonly babylonScene: Scene;
    private sceneLights: Light[] = [];

    constructor(babylonScene: Scene) {
        this.babylonScene = babylonScene;
        this.setupGlobalLight();
    }

    private setupGlobalLight(): void {
        const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), this.babylonScene);
        hemi.intensity = 0.1;
        hemi.diffuse = new Color3(0.45, 0.48, 0.55);
        hemi.groundColor = new Color3(0.06, 0.06, 0.08);
    }

    track(light: Light): Light {
        this.sceneLights.push(light);
        return light;
    }

    clear(): void {
        for (const light of this.sceneLights) {
            light.dispose();
        }
        this.sceneLights = [];
    }
}
