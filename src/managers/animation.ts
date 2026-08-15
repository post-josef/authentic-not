import { Animation, type AbstractMesh, type Observer, type Scene } from "@babylonjs/core";

export type Axis = "x" | "y" | "z";
export type Vec3 = [number, number, number];

export type AnimationConfig =
    | { preset: "float"; axis?: Axis; amplitude: number; speed: number; phase?: number }
    | { preset: "rotate"; axis?: Axis; speed: number }
    | { preset: "pulse"; min: number; max: number; speed: number; phase?: number }
    | {
          preset: "drift";
          amplitude: Vec3;
          speed: Vec3;
          yawAmplitude?: number;
          yawSpeed?: number;
          phase?: number;
      }
    | {
          preset: "orbit";
          center: Vec3;
          radius: number;
          speed: number;
          startAngle?: number;
          heightOffset?: number;
          floatAmplitude?: number;
          floatSpeed?: number;
          floatPhase?: number;
          faceCamera?: boolean;
          cameraSpotAngle?: number;
          cameraSpotWidth?: number;
          tiltPhaseX?: number;
          tiltPhaseZ?: number;
      }
    | {
          preset: "figureEight";
          center: Vec3;
          width: number;
          height: number;
          speed: number;
          phase?: number;
          tiltPhase?: number;
      }
    | {
          preset: "keyframes";
          property: string;
          fps: number;
          loop?: boolean;
          keys: Array<{ frame: number; value: number }>;
      };

interface Track {
    mesh: AbstractMesh;
    proceduralConfigs: Exclude<AnimationConfig, { preset: "keyframes" }>[];
    paused: boolean;
    basePosition: Vec3;
    baseRotation: Vec3;
    baseScaling: Vec3;
    animatables: Array<{ stop: () => void; pause: () => void; restart: () => void }>;
}

function normalizeAngle(angle: number): number {
    let value = angle;
    while (value > Math.PI) value -= Math.PI * 2;
    while (value < -Math.PI) value += Math.PI * 2;
    return value;
}

function smoothstep(value: number): number {
    const clamped = Math.max(0, Math.min(1, value));
    return clamped * clamped * (3 - 2 * clamped);
}

export class AnimationManager {
    private scene: Scene | null = null;
    private tracks = new Map<string, Track>();
    private observer: Observer<Scene> | null = null;

    init(scene: Scene): void {
        this.dispose();
        this.scene = scene;
    }

    add(id: string, mesh: AbstractMesh, config: AnimationConfig): void {
        this.addMany(id, mesh, [config]);
    }

    addMany(id: string, mesh: AbstractMesh, configs: AnimationConfig[]): void {
        this.remove(id);
        const scene = this.requireScene();
        const track: Track = {
            mesh,
            proceduralConfigs: configs.filter(
                (config): config is Exclude<AnimationConfig, { preset: "keyframes" }> =>
                    config.preset !== "keyframes",
            ),
            paused: false,
            basePosition: [mesh.position.x, mesh.position.y, mesh.position.z],
            baseRotation: [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
            baseScaling: [mesh.scaling.x, mesh.scaling.y, mesh.scaling.z],
            animatables: [],
        };

        for (const config of configs) {
            if (config.preset !== "keyframes" || config.keys.length === 0) continue;
            const animation = new Animation(
                `${id}-${config.property}`,
                config.property,
                config.fps,
                Animation.ANIMATIONTYPE_FLOAT,
                config.loop === false
                    ? Animation.ANIMATIONLOOPMODE_CONSTANT
                    : Animation.ANIMATIONLOOPMODE_CYCLE,
            );
            animation.setKeys(config.keys);
            const lastFrame = Math.max(...config.keys.map((key) => key.frame));
            track.animatables.push(
                scene.beginDirectAnimation(mesh, [animation], 0, lastFrame, config.loop !== false),
            );
        }

        this.tracks.set(id, track);
        if (track.proceduralConfigs.length > 0) this.ensureObserver();
    }

    play(id: string): void {
        const track = this.tracks.get(id);
        if (!track) return;
        track.paused = false;
        track.animatables.forEach((item) => item.restart());
    }

    pause(id: string): void {
        const track = this.tracks.get(id);
        if (!track) return;
        track.paused = true;
        track.animatables.forEach((item) => item.pause());
    }

    stop(id: string): void {
        const track = this.tracks.get(id);
        if (!track) return;
        track.paused = true;
        track.animatables.forEach((item) => item.stop());
        this.restoreBase(track);
    }

    remove(id: string): void {
        const track = this.tracks.get(id);
        if (!track) return;
        track.animatables.forEach((item) => item.stop());
        this.tracks.delete(id);
        if (this.tracks.size === 0) this.removeObserver();
    }

    clear(): void {
        [...this.tracks.keys()].forEach((id) => this.remove(id));
        this.removeObserver();
    }

    dispose(): void {
        this.clear();
        this.scene = null;
    }

    private requireScene(): Scene {
        if (!this.scene) throw new Error("animationManager.init(scene) must be called first");
        return this.scene;
    }

    private ensureObserver(): void {
        if (this.observer) return;
        const scene = this.requireScene();
        this.observer = scene.onBeforeRenderObservable.add(() => {
            const time = performance.now() * 0.001;
            this.tracks.forEach((track) => {
                if (!track.paused) this.updateTrack(track, time);
            });
        });
    }

    private removeObserver(): void {
        if (this.scene && this.observer) this.scene.onBeforeRenderObservable.remove(this.observer);
        this.observer = null;
    }

    private restoreBase(track: Track): void {
        track.mesh.position.set(...track.basePosition);
        track.mesh.rotation.set(...track.baseRotation);
        track.mesh.scaling.set(...track.baseScaling);
    }

    private updateTrack(track: Track, time: number): void {
        const position = [...track.basePosition] as Vec3;
        const rotation = [...track.baseRotation] as Vec3;
        const scaling = [...track.baseScaling] as Vec3;

        for (const config of track.proceduralConfigs) {
            const phase = "phase" in config ? (config.phase ?? 0) : 0;
            switch (config.preset) {
                case "float": {
                    const index = config.axis === "x" ? 0 : config.axis === "z" ? 2 : 1;
                    position[index] =
                        track.basePosition[index] +
                        Math.sin(time * config.speed + phase) * config.amplitude;
                    break;
                }
                case "rotate": {
                    const index = config.axis === "x" ? 0 : config.axis === "z" ? 2 : 1;
                    rotation[index] = track.baseRotation[index] + time * config.speed;
                    break;
                }
                case "pulse": {
                    const mid = (config.min + config.max) / 2;
                    const amplitude = (config.max - config.min) / 2;
                    const value = mid + Math.sin(time * config.speed + phase) * amplitude;
                    scaling[0] = track.baseScaling[0] * value;
                    scaling[1] = track.baseScaling[1] * value;
                    break;
                }
                case "drift": {
                    position[0] =
                        track.basePosition[0] +
                        Math.cos(time * config.speed[0] + phase) * config.amplitude[0];
                    position[1] =
                        track.basePosition[1] +
                        Math.sin(time * config.speed[1] + phase) * config.amplitude[1];
                    position[2] =
                        track.basePosition[2] +
                        Math.sin(time * config.speed[2] + phase) * config.amplitude[2];
                    rotation[1] =
                        track.baseRotation[1] +
                        Math.sin(time * (config.yawSpeed ?? 0.9) + phase) *
                            (config.yawAmplitude ?? 0);
                    break;
                }
                case "orbit": {
                    const angle = (config.startAngle ?? 0) + time * config.speed;
                    position[0] = config.center[0] + Math.cos(angle) * config.radius;
                    position[1] =
                        config.center[1] +
                        (config.heightOffset ?? 0) +
                        Math.sin(time * (config.floatSpeed ?? 1.3) + (config.floatPhase ?? 0)) *
                            (config.floatAmplitude ?? 0);
                    position[2] = config.center[2] + Math.sin(angle) * config.radius;
                    const orbitY = Math.atan2(-Math.sin(angle), Math.cos(angle));
                    rotation[1] = orbitY;

                    if (config.faceCamera) {
                        const camera = this.requireScene().activeCamera;
                        const cameraY = Math.atan2(
                            (camera?.position.x ?? 0) - position[0],
                            (camera?.position.z ?? -10) - position[2],
                        );
                        const proximity = smoothstep(
                            1 -
                                Math.abs(
                                    normalizeAngle(angle - (config.cameraSpotAngle ?? -Math.PI / 2)),
                                ) /
                                    (config.cameraSpotWidth ?? 0.55),
                        );
                        rotation[1] = orbitY + normalizeAngle(cameraY - orbitY) * proximity;
                        const tiltScale = 1 - proximity * 0.85;
                        rotation[0] =
                            Math.sin(time * 1.6 + (config.tiltPhaseX ?? 0)) *
                            0.06 *
                            tiltScale;
                        rotation[2] =
                            Math.cos(time * 2.1 + (config.tiltPhaseZ ?? 0)) *
                            0.04 *
                            tiltScale;
                    }
                    break;
                }
                case "figureEight": {
                    const parameter = time * config.speed + phase;
                    position[0] = config.center[0] + config.width * Math.cos(parameter);
                    position[1] = config.center[1] + Math.sin(parameter * 2) * config.height;
                    position[2] =
                        config.center[2] +
                        config.width * Math.sin(parameter) * Math.cos(parameter);
                    rotation[1] = Math.atan2(
                        -config.width * Math.sin(parameter),
                        config.width * Math.cos(parameter * 2),
                    );
                    const tiltPhase = config.tiltPhase ?? 0;
                    rotation[0] = Math.sin(time * 1.4 + tiltPhase) * 0.05;
                    rotation[2] = Math.cos(time * 1.1 + tiltPhase * 0.8) * 0.04;
                    break;
                }
            }
        }

        track.mesh.position.set(...position);
        track.mesh.rotation.set(...rotation);
        track.mesh.scaling.set(...scaling);
    }
}

export const animationManager = new AnimationManager();
