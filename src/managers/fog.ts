import {
    Color3,
    Color4,
    DynamicTexture,
    ParticleSystem,
    Scene,
    Vector3,
    type Observer,
} from "@babylonjs/core";
import { cameraManager } from "./camera";

export interface FogConfig {
    mode: "none" | "linear" | "exp" | "exp2";
    color?: [number, number, number];
    density?: number;
    start?: number;
    end?: number;
}

export interface MistConfig {
    color?: [number, number, number];
    /** Alpha of a single puff at its peak. Keep low; puffs stack. */
    opacity?: number;
    /** How many puffs are alive at once. */
    count?: number;
    /** [min, max] puff diameter in world units. */
    size?: [number, number];
    center?: [number, number, number];
    /** Half-extents of the box the puffs spawn in. */
    extents?: [number, number, number];
    speed?: number;
    /** Keeps the puff volume centred on the camera so you never walk out of it. */
    followCamera?: boolean;
}

const MODES = {
    none: Scene.FOGMODE_NONE,
    linear: Scene.FOGMODE_LINEAR,
    exp: Scene.FOGMODE_EXP,
    exp2: Scene.FOGMODE_EXP2,
};

/** Babylon's built-in fog is global and camera-distance based, not position-local. */
export class FogManager {
    private scene: Scene | null = null;
    private transition: Observer<Scene> | null = null;
    private mist: ParticleSystem | null = null;
    private mistTexture: DynamicTexture | null = null;
    private mistFollow: Observer<Scene> | null = null;

    init(scene: Scene): void {
        this.dispose();
        this.scene = scene;
    }

    set(config: FogConfig): void {
        this.cancelTransition();
        const scene = this.requireScene();
        scene.fogMode = MODES[config.mode];
        if (config.color) scene.fogColor = new Color3(...config.color);
        if (config.density !== undefined) scene.fogDensity = config.density;
        if (config.start !== undefined) scene.fogStart = config.start;
        if (config.end !== undefined) scene.fogEnd = config.end;
    }

    tweenTo(config: FogConfig, durationMs: number): void {
        this.cancelTransition();
        const scene = this.requireScene();
        const fromColor = scene.fogColor.clone();
        const toColor = config.color ?? [fromColor.r, fromColor.g, fromColor.b];
        const fromDensity = scene.fogDensity;
        const fromStart = scene.fogStart;
        const fromEnd = scene.fogEnd;
        const startedAt = performance.now();

        if (config.mode !== "none") scene.fogMode = MODES[config.mode];
        this.transition = scene.onBeforeRenderObservable.add(() => {
            const linear = Math.min(1, (performance.now() - startedAt) / Math.max(1, durationMs));
            const t = linear * linear * (3 - 2 * linear);
            scene.fogColor.set(
                fromColor.r + (toColor[0] - fromColor.r) * t,
                fromColor.g + (toColor[1] - fromColor.g) * t,
                fromColor.b + (toColor[2] - fromColor.b) * t,
            );
            if (config.density !== undefined) {
                scene.fogDensity = fromDensity + (config.density - fromDensity) * t;
            }
            if (config.start !== undefined) {
                scene.fogStart = fromStart + (config.start - fromStart) * t;
            }
            if (config.end !== undefined) {
                scene.fogEnd = fromEnd + (config.end - fromEnd) * t;
            }
            if (linear >= 1) {
                this.cancelTransition();
                this.set(config);
            }
        });
    }

    /**
     * Distance fog only tints geometry, so an empty room shows nothing. This layers soft
     * billboard puffs through the space to read as actual mist.
     */
    setMist(config: MistConfig = {}): void {
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

    clearMist(): void {
        if (this.scene && this.mistFollow) {
            this.scene.onBeforeRenderObservable.remove(this.mistFollow);
        }
        this.mistFollow = null;
        this.mist?.dispose();
        this.mist = null;
        this.mistTexture?.dispose();
        this.mistTexture = null;
    }

    clear(): void {
        this.cancelTransition();
        this.clearMist();
        if (this.scene) this.scene.fogMode = Scene.FOGMODE_NONE;
    }

    dispose(): void {
        this.clear();
        this.scene = null;
    }

    private createPuffTexture(scene: Scene): DynamicTexture {
        const size = 128;
        const texture = new DynamicTexture("mistPuff", { width: size, height: size }, scene, false);
        const context = texture.getContext();
        const gradient = context.createRadialGradient(
            size / 2,
            size / 2,
            0,
            size / 2,
            size / 2,
            size / 2,
        );
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

    private cancelTransition(): void {
        if (this.scene && this.transition) {
            this.scene.onBeforeRenderObservable.remove(this.transition);
        }
        this.transition = null;
    }
}

export const fogManager = new FogManager();
