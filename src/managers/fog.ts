import { Color3, Color4, DynamicTexture, ParticleSystem, Scene, Vector3 } from "@babylonjs/core";
import type { Observer } from "@babylonjs/core";
import { cameraManager } from "./camera";

const MODES = {
    linear: Scene.FOGMODE_LINEAR,
    exp: Scene.FOGMODE_EXP,
    exp2: Scene.FOGMODE_EXP2,
};

export class FogManager {
    private scene: Scene | null = null;
    private transition: Observer<Scene> | null = null;
    private mist: ParticleSystem | null = null;
    private mistTexture: DynamicTexture | null = null;
    private mistFollow: Observer<Scene> | null = null;

    init(scene: Scene) {
        this.dispose();
        this.scene = scene;
    }

    /**
     * Babylon's built-in fog is global and camera-distance based.
     */
    set(config: {
        mode?: "linear" | "exp" | "exp2";
        color?: [number, number, number];
        density?: number;
        start?: number;
        end?: number;
    }) {
        this.cancelTransition();
        const scene = this.requireScene();
        scene.fogMode = MODES[config.mode || "exp2"];
        if (config.color) scene.fogColor = new Color3(...config.color);
        if (config.density !== undefined) scene.fogDensity = config.density;
        if (config.start !== undefined) scene.fogStart = config.start;
        if (config.end !== undefined) scene.fogEnd = config.end;
    }

    /**
     * Distance fog only tints meshes to fogColor, so an empty room shows nothing.
     * This layers soft puffs through the space to look like actual mist.
     */
    setMist(
        config: {
            color?: [number, number, number];
            opacity?: number; // alpha of a single puff at its peak. Keep low; puffs stack
            count?: number; // how many puffs are alive at once
            size?: [number, number]; // [min, max] puff diameter
            center?: [number, number, number];
            extents?: [number, number, number]; // half-extents of the box the puffs spawn in
            speed?: number;
            followCamera?: boolean; // keeps the puff volume centred on the camera
        } = {},
    ) {
        this.clearMist();
        const scene = this.requireScene();
        const [red, green, blue] = config.color ?? [0.62, 0.68, 0.8];
        const opacity = config.opacity ?? 0.06;
        const count = config.count ?? 240;
        const [minSize, maxSize] = config.size ?? [7, 16];
        const center = config.center ?? [0, 2, 5];
        const extents = config.extents ?? [16, 4, 14];
        const speed = config.speed ?? 0.3;

        this.mistTexture = this.createPuffTexture(scene);
        const system = new ParticleSystem("sceneMist", count, scene);
        system.particleTexture = this.mistTexture;
        const emitter = new Vector3(...center);
        system.emitter = emitter;
        system.minEmitBox = new Vector3(-extents[0], -extents[1], -extents[2]);
        system.maxEmitBox = new Vector3(...extents);
        system.blendMode = ParticleSystem.BLENDMODE_STANDARD;

        system.minSize = minSize;
        system.maxSize = maxSize;
        system.minLifeTime = 14;
        system.maxLifeTime = 22;
        system.emitRate = count / 16;

        // Fade each puff in and out so they never pop at the edges of their lifetime.
        system.addColorGradient(0, new Color4(red, green, blue, 0));
        system.addColorGradient(0.3, new Color4(red, green, blue, opacity));
        system.addColorGradient(0.7, new Color4(red, green, blue, opacity));
        system.addColorGradient(1, new Color4(red, green, blue, 0));

        system.direction1 = new Vector3(-1, 0.1, -0.6);
        system.direction2 = new Vector3(1, -0.1, 0.6);
        system.minEmitPower = speed * 0.35;
        system.maxEmitPower = speed;
        system.gravity = Vector3.Zero();
        system.updateSpeed = 0.01;
        system.minInitialRotation = 0;
        system.maxInitialRotation = Math.PI * 2;
        system.minAngularSpeed = -0.1;
        system.maxAngularSpeed = 0.1;

        // Fill the volume before the first frame instead of drifting in over ~15s.
        system.preWarmCycles = 150;
        system.preWarmStepOffset = 4;
        system.start();
        this.mist = system;

        if (config.followCamera) {
            this.mistFollow = scene.onBeforeRenderObservable.add(() => {
                const position = cameraManager.getCamera().position;
                emitter.set(position.x, center[1], position.z);
            });
        }
    }

    clearMist() {
        if (this.scene && this.mistFollow) {
            this.scene.onBeforeRenderObservable.remove(this.mistFollow);
        }
        this.mistFollow = null;
        this.mist?.dispose();
        this.mist = null;
        this.mistTexture?.dispose();
        this.mistTexture = null;
    }

    clear() {
        this.cancelTransition();
        this.clearMist();
        if (this.scene) this.scene.fogMode = Scene.FOGMODE_NONE;
    }

    dispose() {
        this.clear();
        this.scene = null;
    }

    private createPuffTexture(scene: Scene): DynamicTexture {
        const size = 128;
        const texture = new DynamicTexture("mistPuff", { width: size, height: size }, scene, false);
        const context = texture.getContext();
        const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
        gradient.addColorStop(0.45, "rgba(255, 255, 255, 0.35)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
        texture.update();
        texture.hasAlpha = true;
        return texture;
    }

    private requireScene(): Scene {
        if (!this.scene) throw new Error("fogManager.init(scene) must be called first");
        return this.scene;
    }

    private cancelTransition() {
        if (this.scene && this.transition) {
            this.scene.onBeforeRenderObservable.remove(this.transition);
        }
        this.transition = null;
    }
}

export const fogManager = new FogManager();
