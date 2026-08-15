import {
    Engine,
    Sound,
    Vector3,
    type AbstractMesh,
    type Observer,
    type Scene,
} from "@babylonjs/core";
// Registers AbstractEngine.AudioEngineFactory. Without it the engine never creates an
// audio engine and every Sound.play() is a silent no-op.
import "@babylonjs/core/Audio/audioEngine";
import "@babylonjs/core/Audio/audioSceneComponent";
import { cameraManager } from "./camera";

export interface SoundOptions {
    volume?: number;
    loop?: boolean;
    spatial?: boolean;
    position?: [number, number, number];
    maxDistance?: number;
    playbackRate?: number;
    attachToMesh?: AbstractMesh;
    /** Keeps the sound alive across scene switches so playback is not cut short. */
    persist?: boolean;
}

export interface PlayOptions {
    waitUntilEnded?: boolean;
    timeoutMs?: number;
}

export interface AudioZone {
    id: string;
    soundId: string;
    shape: "sphere" | "box";
    center: [number, number, number];
    radius?: number;
    size?: [number, number, number];
    behavior: "playOnceOnEnter" | "loopWhileInside";
}

interface ZoneState {
    zone: AudioZone;
    inside: boolean;
    played: boolean;
}

export class AudioManager {
    private scene: Scene | null = null;
    private sounds = new Map<string, Sound>();
    private generatedUrls = new Map<string, string>();
    private persistent = new Set<string>();
    private zones: ZoneState[] = [];
    private zoneObserver: Observer<Scene> | null = null;
    private unlocked = false;

    init(scene: Scene): void {
        this.dispose();
        this.scene = scene;
    }

    unlock(): void {
        this.unlocked = true;
        if (this.scene) this.scene.audioEnabled = true;
        const audioEngine = Engine.audioEngine;
        if (audioEngine && !audioEngine.unlocked) audioEngine.unlock();
    }

    load(id: string, url: string, options: SoundOptions = {}): Sound {
        // Reloading a persistent sound mid-playback would cut it off on scene re-entry.
        const existing = this.sounds.get(id);
        if (existing && options.persist && existing.isPlaying) return existing;

        this.removeSound(id);
        const sound = new Sound(id, url, this.requireScene(), undefined, {
            autoplay: false,
            loop: options.loop ?? false,
            volume: options.volume ?? 1,
            spatialSound: options.spatial ?? false,
            maxDistance: options.maxDistance ?? 50,
            playbackRate: options.playbackRate ?? 1,
        });
        if (options.position) sound.setPosition(new Vector3(...options.position));
        if (options.attachToMesh) sound.attachToMesh(options.attachToMesh);
        if (
            this.zones.some(
                ({ zone }) =>
                    zone.soundId === id && zone.behavior === "loopWhileInside",
            )
        ) {
            sound.loop = true;
        }
        this.sounds.set(id, sound);
        if (options.persist) this.persistent.add(id);
        return sound;
    }

    /** Creates a small offline WAV tone, useful for interactions and prototypes. */
    loadTone(
        id: string,
        options: SoundOptions & { frequency?: number; durationMs?: number } = {},
    ): Sound {
        const url = this.createToneUrl(options.frequency ?? 520, options.durationMs ?? 90);
        const sound = this.load(id, url, options);
        this.generatedUrls.set(id, url);
        return sound;
    }

    play(id: string, options: PlayOptions = {}): Promise<void> {
        const sound = this.sounds.get(id);
        if (!sound) {
            console.warn(`[audioManager] Unknown sound "${id}"`);
            return Promise.resolve();
        }
        this.unlock();
        if (sound.isPlaying) sound.stop();
        if (!options.waitUntilEnded) {
            sound.play();
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            let finished = false;
            const finish = () => {
                if (finished) return;
                finished = true;
                window.clearTimeout(timeout);
                resolve();
            };
            const timeout = window.setTimeout(finish, options.timeoutMs ?? 10_000);
            sound.onEndedObservable.addOnce(finish);
            sound.play();
        });
    }

    pause(id: string): void {
        this.sounds.get(id)?.pause();
    }

    stop(id: string): void {
        this.sounds.get(id)?.stop();
    }

    setVolume(id: string, volume: number): void {
        this.sounds.get(id)?.setVolume(volume);
    }

    addZone(zone: AudioZone): void {
        this.zones.push({ zone, inside: false, played: false });
        if (zone.behavior === "loopWhileInside") {
            const sound = this.sounds.get(zone.soundId);
            if (sound) sound.loop = true;
        }
        this.ensureZoneObserver();
    }

    /** Scene-switch cleanup. Sounds loaded with `persist` keep playing. */
    clear(): void {
        [...this.sounds.keys()]
            .filter((id) => !this.persistent.has(id))
            .forEach((id) => this.removeSound(id));
        this.zones = [];
        this.removeZoneObserver();
    }

    dispose(): void {
        this.persistent.clear();
        this.clear();
        this.scene = null;
        this.unlocked = false;
    }

    private requireScene(): Scene {
        if (!this.scene) throw new Error("audioManager.init(scene) must be called first");
        return this.scene;
    }

    private removeSound(id: string): void {
        const previous = this.sounds.get(id);
        if (previous) {
            try {
                previous.stop();
                previous.dispose();
            } catch (error) {
                console.warn(`[audioManager] Failed to dispose sound "${id}"`, error);
            }
        }
        const generatedUrl = this.generatedUrls.get(id);
        if (generatedUrl) URL.revokeObjectURL(generatedUrl);
        this.generatedUrls.delete(id);
        this.persistent.delete(id);
        this.sounds.delete(id);
    }

    private ensureZoneObserver(): void {
        if (this.zoneObserver) return;
        const scene = this.requireScene();
        this.zoneObserver = scene.onBeforeRenderObservable.add(() => {
            if (!this.unlocked) return;
            const position = cameraManager.getCamera().position;
            this.zones.forEach((state) => {
                const inside = this.isInside(state.zone, position);
                if (inside && !state.inside) {
                    if (state.zone.behavior === "loopWhileInside" || !state.played) {
                        this.play(state.zone.soundId);
                        state.played = true;
                    }
                } else if (!inside && state.inside && state.zone.behavior === "loopWhileInside") {
                    this.stop(state.zone.soundId);
                }
                state.inside = inside;
            });
        });
    }

    private removeZoneObserver(): void {
        if (this.scene && this.zoneObserver) {
            this.scene.onBeforeRenderObservable.remove(this.zoneObserver);
        }
        this.zoneObserver = null;
    }

    private isInside(zone: AudioZone, position: Vector3): boolean {
        const center = new Vector3(...zone.center);
        if (zone.shape === "sphere") {
            return Vector3.DistanceSquared(center, position) <= Math.pow(zone.radius ?? 2, 2);
        }
        const size = zone.size ?? [2, 2, 2];
        return (
            Math.abs(position.x - center.x) <= size[0] / 2 &&
            Math.abs(position.y - center.y) <= size[1] / 2 &&
            Math.abs(position.z - center.z) <= size[2] / 2
        );
    }

    private createToneUrl(frequency: number, durationMs: number): string {
        const sampleRate = 11025;
        const sampleCount = Math.max(1, Math.floor((sampleRate * durationMs) / 1000));
        const buffer = new ArrayBuffer(44 + sampleCount * 2);
        const view = new DataView(buffer);
        const write = (offset: number, value: string) => {
            for (let index = 0; index < value.length; index++) {
                view.setUint8(offset + index, value.charCodeAt(index));
            }
        };
        write(0, "RIFF");
        view.setUint32(4, 36 + sampleCount * 2, true);
        write(8, "WAVE");
        write(12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        write(36, "data");
        view.setUint32(40, sampleCount * 2, true);
        for (let index = 0; index < sampleCount; index++) {
            const fade = 1 - index / sampleCount;
            const sample = Math.sin((2 * Math.PI * frequency * index) / sampleRate) * fade;
            view.setInt16(44 + index * 2, sample * 12000, true);
        }
        return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
    }
}

export const audioManager = new AudioManager();
