import type { Observer } from "@babylonjs/core";
import { UniversalCamera, Vector3, FreeCameraKeyboardMoveInput, type Scene } from "@babylonjs/core";

const WALK_HEIGHT = 1.7;
const DEFAULT_POSITION = new Vector3(0, WALK_HEIGHT, -10);
const RESET_ANIMATION_MS = 900;

function smoothstep(t: number): number {
    const c = Math.max(0, Math.min(1, t));
    return c * c * (3 - 2 * c);
}

export class CameraManager {
    private readonly babylonScene: Scene;
    private readonly canvas: HTMLCanvasElement;
    private readonly camera: UniversalCamera;
    private readonly defaultRotation: Vector3;
    private readonly isInteractionBlocked: () => boolean;

    private heightObserver: Observer<Scene> | null = null;
    private animObserver: Observer<Scene> | null = null;
    private animFromPosition: Vector3 | null = null;
    private animFromRotation: Vector3 | null = null;
    private animStart = 0;

    constructor(babylonScene: Scene, canvas: HTMLCanvasElement, options: { isInteractionBlocked: () => boolean }) {
        this.babylonScene = babylonScene;
        this.canvas = canvas;
        this.isInteractionBlocked = options.isInteractionBlocked;
        this.camera = this.createWalkCamera();
        this.defaultRotation = this.camera.rotation.clone();
        this.bindDoubleClick();
    }

    getCamera(): UniversalCamera {
        return this.camera;
    }

    detachControl(): void {
        this.camera.detachControl();
    }

    attachControl(): void {
        this.camera.attachControl(this.canvas, true);
    }

    reset(instant: boolean): void {
        if (instant) {
            this.stopAnimation();
            this.camera.position.copyFrom(DEFAULT_POSITION);
            this.camera.rotation.copyFrom(this.defaultRotation);
            return;
        }

        this.stopAnimation();
        this.animFromPosition = this.camera.position.clone();
        this.animFromRotation = this.camera.rotation.clone();
        this.animStart = performance.now();

        this.animObserver = this.babylonScene.onBeforeRenderObservable.add(() => {
            const t = smoothstep((performance.now() - this.animStart) / RESET_ANIMATION_MS);

            if (this.animFromPosition) {
                Vector3.LerpToRef(this.animFromPosition, DEFAULT_POSITION, t, this.camera.position);
            }
            if (this.animFromRotation) {
                this.camera.rotation.x =
                    this.animFromRotation.x + (this.defaultRotation.x - this.animFromRotation.x) * t;
                this.camera.rotation.y =
                    this.animFromRotation.y + (this.defaultRotation.y - this.animFromRotation.y) * t;
                this.camera.rotation.z =
                    this.animFromRotation.z + (this.defaultRotation.z - this.animFromRotation.z) * t;
            }

            if (t >= 1) {
                this.stopAnimation();
            }
        });
    }

    dispose(): void {
        this.stopAnimation();
        if (this.heightObserver) {
            this.babylonScene.onBeforeRenderObservable.remove(this.heightObserver);
            this.heightObserver = null;
        }
        this.camera.dispose();
    }

    private createWalkCamera(): UniversalCamera {
        const camera = new UniversalCamera("cam", DEFAULT_POSITION.clone(), this.babylonScene);
        camera.speed = 0.2;
        camera.inputs.removeByType("FreeCameraKeyboardMoveInput");
        const keyboard = new FreeCameraKeyboardMoveInput();
        keyboard.keysUp = [38, 87];
        keyboard.keysDown = [40, 83];
        keyboard.keysLeft = [37, 65];
        keyboard.keysRight = [39, 68];
        keyboard.keysUpward = [];
        keyboard.keysDownward = [];
        camera.inputs.add(keyboard);
        camera.attachControl(this.canvas, true);

        this.heightObserver = this.babylonScene.onBeforeRenderObservable.add(() => {
            if (!this.animObserver) {
                camera.position.y = WALK_HEIGHT;
            }
        });

        return camera;
    }

    private bindDoubleClick(): void {
        this.canvas.addEventListener("dblclick", (e) => {
            if (this.isInteractionBlocked()) return;
            if (this.pickHitPickableMesh(e)) return;
            this.reset(false);
        });
    }

    private pickHitPickableMesh(e: MouseEvent): boolean {
        const rect = this.canvas.getBoundingClientRect();
        const engine = this.babylonScene.getEngine();
        const x = ((e.clientX - rect.left) / rect.width) * engine.getRenderWidth();
        const y = ((e.clientY - rect.top) / rect.height) * engine.getRenderHeight();
        const pick = this.babylonScene.pick(x, y);
        return Boolean(pick?.hit && pick.pickedMesh?.isPickable);
    }

    private stopAnimation(): void {
        if (this.animObserver) {
            this.babylonScene.onBeforeRenderObservable.remove(this.animObserver);
            this.animObserver = null;
        }
        this.animFromPosition = null;
        this.animFromRotation = null;
    }
}
