import { Sound } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core";
import { LastCreatedAudioEngine } from "@babylonjs/core/AudioV2/abstractAudio/audioEngineV2";
// Registers AbstractEngine.AudioEngineFactory. Without it audio engine is never created and every Sound.play() is silent
import "@babylonjs/core/Audio/audioEngine";
import "@babylonjs/core/Audio/audioSceneComponent";

export interface SoundOptions {
    volume?: number;
    loop?: boolean;
    spatial?: boolean; // stereo - true by default
    persist?: boolean; // keep playing across scene switches - false by default
}

export class AudioManager {
    private scene: Scene | null = null;
    private sounds = new Map<string, Sound>();
    private persistent = new Set<string>();
    private pendingPlay = new Set<string>();

    init(scene: Scene) {
        this.dispose();
        this.scene = scene;
    }

    /** Call from a user-gesture handler (pointer/keyboard). Resumes Web Audio and starts queued sounds. */
    unlock() {
        const engine = LastCreatedAudioEngine();
        if (!engine) return;
        void engine.unlockAsync().then(() => this.flushPending());
    }

    load(url: string, options: SoundOptions = {}) {
        // Reloading a persistent sound mid-playback would cut it off on scene re-entry
        const existing = this.sounds.get(url);
        if (existing && options.persist && existing.isPlaying) return;

        this.removeSound(url);
        const sound = new Sound(url, url, this.requireScene(), undefined, {
            autoplay: false,
            loop: options.loop ?? false,
            volume: options.volume ?? 1,
            spatialSound: options.spatial ?? true,
        });
        this.sounds.set(url, sound);
        if (options.persist) this.persistent.add(url);
    }

    play(url: string, options: SoundOptions = {}) {
        let sound = this.sounds.get(url);
        if (!sound) {
            this.load(url, options);
            sound = this.sounds.get(url);
            if (!sound) return;
        }
        this.applyOptions(url, sound, options);

        if (!this.isRunning()) {
            this.pendingPlay.add(url);
            return;
        }

        if (!sound.isReady()) {
            sound.autoplay = true;
            return;
        }

        this.startSound(sound);
    }

    /** Scene-switch cleanup. Sounds loaded with `persist` keep playing. */
    clear() {
        [...this.sounds.keys()].filter((id) => !this.persistent.has(id)).forEach((id) => this.removeSound(id));
    }

    dispose() {
        this.pendingPlay.clear();
        [...this.sounds.keys()].forEach((id) => this.removeSound(id));
        this.persistent.clear();
        this.scene = null;
    }

    private isRunning(): boolean {
        return LastCreatedAudioEngine()?.state === "running";
    }

    private flushPending() {
        if (!this.isRunning()) return;
        for (const url of [...this.pendingPlay]) {
            const sound = this.sounds.get(url);
            if (!sound) {
                this.pendingPlay.delete(url);
                continue;
            }
            if (!sound.isReady()) {
                sound.autoplay = true;
                this.pendingPlay.delete(url);
                continue;
            }
            this.pendingPlay.delete(url);
            this.startSound(sound);
        }
    }

    private startSound(sound: Sound) {
        if (sound.isPlaying) sound.stop();
        sound.play();
    }

    private applyOptions(url: string, sound: Sound, options: SoundOptions) {
        if (options.volume !== undefined) sound.setVolume(options.volume);
        if (options.loop !== undefined) sound.loop = options.loop;
        if (options.spatial !== undefined) sound.spatialSound = options.spatial;
        if (options.persist !== undefined) {
            if (options.persist) this.persistent.add(url);
            else this.persistent.delete(url);
        }
    }

    private requireScene(): Scene {
        if (!this.scene) throw new Error("audioManager.init(scene) must be called first");
        return this.scene;
    }

    private removeSound(url: string) {
        this.pendingPlay.delete(url);
        const previous = this.sounds.get(url);
        if (previous) {
            try {
                previous.stop();
                previous.dispose();
            } catch (error) {
                console.warn(`[audioManager] Failed to dispose sound "${url}"`, error);
            }
        }
        this.persistent.delete(url);
        this.sounds.delete(url);
    }
}

export const audioManager = new AudioManager();
