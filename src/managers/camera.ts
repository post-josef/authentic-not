import {
    ArcRotateCamera,
    ArcRotateCameraKeyboardMoveInput,
    UniversalCamera,
    Vector3,
    type Camera,
    type Observer,
    type Scene,
} from "@babylonjs/core";

const WALK_POSITION = new Vector3(0, 1.7, -10);
const RESET_MS = 900;

export class CameraManager {
    private scene: Scene | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private walkCam: UniversalCamera | null = null;
    private orbitCam: ArcRotateCamera | null = null;
    private heightObserver: Observer<Scene> | null = null;
    private resetObserver: Observer<Scene> | null = null;
    private walkSpawn = WALK_POSITION.clone();
    private walkRotation = Vector3.Zero();
    private orbitSpawn: { alpha: number; beta: number; radius: number; target: Vector3 } | null = null;

    init(scene: Scene, canvas: HTMLCanvasElement): void {
        this.dispose();
        this.scene = scene;
        this.canvas = canvas;

        const camera = new UniversalCamera("cam", WALK_POSITION.clone(), scene);
        camera.speed = 0.2;
        setCameraArrows(camera);
        camera.keysUpward = [];
        camera.keysDownward = [];
        camera.attachControl(canvas, true);
        camera.storeState();
        this.walkSpawn.copyFrom(camera.position);
        this.walkRotation.copyFrom(camera.rotation);

        this.heightObserver = scene.onBeforeRenderObservable.add(() => {
            if (scene.activeCamera !== camera || this.resetObserver) return;
            camera.position.y = WALK_POSITION.y;
        });
        this.walkCam = camera;
        scene.activeCamera = camera;
        canvas.addEventListener("dblclick", this.onDoubleClick);
    }

    getCamera(): Camera {
        const camera = this.scene?.activeCamera;
        if (!camera) throw new Error("cameraManager.init(scene, canvas) must be called first");
        return camera;
    }

    setOrbit(
        params: {
            target?: Vector3;
            distance?: number;
            maxDistance?: number;
            minDistance?: number;
        } = {},
    ): void {
        if (!this.scene || !this.canvas) throw new Error("cameraManager.init(scene, canvas) must be called first");

        this.stopReset();
        this.walkCam?.detachControl();
        this.orbitCam?.dispose();

        const target = params.target ?? Vector3.Zero();
        const distance = params.distance ?? 20;

        const camera = new ArcRotateCamera("orbitCam", 0, Math.PI / 3, distance, target, this.scene);
        camera.setPosition(WALK_POSITION.clone());
        camera.radius = distance;
        camera.lowerRadiusLimit = params.minDistance ?? 2;
        camera.upperRadiusLimit = params.maxDistance ?? 40;
        camera.useInputToRestoreState = false;

        const keyboard = camera.inputs.attached.keyboard as ArcRotateCameraKeyboardMoveInput | undefined;
        if (keyboard) {
            setCameraArrows(keyboard);
            keyboard.angularSpeed = 0.005;
        }
        camera.attachControl(this.canvas, true);
        camera.storeState();
        this.orbitSpawn = {
            alpha: camera.alpha,
            beta: camera.beta,
            radius: camera.radius,
            target: camera.getTarget().clone(),
        };
        this.orbitCam = camera;
        this.scene.activeCamera = camera;
    }

    resetSceneConfig(): void {
        this.stopReset();
        this.orbitCam?.dispose();
        this.orbitCam = null;
        this.orbitSpawn = null;
        if (!this.walkCam || !this.scene || !this.canvas) return;
        this.scene.activeCamera = this.walkCam;
        this.walkCam.attachControl(this.canvas, true);
        this.walkCam.restoreState();
        this.walkSpawn.copyFrom(this.walkCam.position);
        this.walkRotation.copyFrom(this.walkCam.rotation);
    }

    detachControl(): void {
        this.getCamera().detachControl();
    }

    attachControl(): void {
        if (this.canvas) this.getCamera().attachControl(this.canvas, true);
    }

    dispose(): void {
        this.stopReset();
        if (this.scene && this.heightObserver) {
            this.scene.onBeforeRenderObservable.remove(this.heightObserver);
        }
        this.heightObserver = null;
        this.canvas?.removeEventListener("dblclick", this.onDoubleClick);
        this.walkCam?.dispose();
        this.orbitCam?.dispose();
        this.walkCam = null;
        this.orbitCam = null;
        this.canvas = null;
        this.scene = null;
    }

    private readonly onDoubleClick = (): void => {
        const scene = this.scene;
        if (!scene) return;
        const camera = this.getCamera();
        this.stopReset();

        if (camera instanceof ArcRotateCamera && this.orbitSpawn) {
            const spawn = this.orbitSpawn;
            camera.stopInterpolation();
            camera.inertialAlphaOffset = 0;
            camera.inertialBetaOffset = 0;
            camera.inertialRadiusOffset = 0;
            camera.inertialPanningX = 0;
            camera.inertialPanningY = 0;
            const fromAlpha = camera.alpha;
            const fromBeta = camera.beta;
            const fromRadius = camera.radius;
            const fromTarget = camera.getTarget().clone();
            const startedAt = performance.now();
            this.resetObserver = scene.onBeforeRenderObservable.add(() => {
                const t = smoothstep((performance.now() - startedAt) / RESET_MS);
                camera.alpha = lerpAngle(fromAlpha, spawn.alpha, t);
                camera.beta = fromBeta + (spawn.beta - fromBeta) * t;
                camera.radius = fromRadius + (spawn.radius - fromRadius) * t;
                camera.setTarget(Vector3.Lerp(fromTarget, spawn.target, t));
                if (t >= 1) this.stopReset();
            });
            return;
        }

        if (!(camera instanceof UniversalCamera)) return;
        const fromPosition = camera.position.clone();
        const fromRotation = camera.rotation.clone();
        const startedAt = performance.now();
        this.resetObserver = scene.onBeforeRenderObservable.add(() => {
            const t = smoothstep((performance.now() - startedAt) / RESET_MS);
            Vector3.LerpToRef(fromPosition, this.walkSpawn, t, camera.position);
            Vector3.LerpToRef(fromRotation, this.walkRotation, t, camera.rotation);
            if (t >= 1) this.stopReset();
        });
    };

    private stopReset(): void {
        if (this.scene && this.resetObserver) {
            this.scene.onBeforeRenderObservable.remove(this.resetObserver);
        }
        this.resetObserver = null;
    }
}

function setCameraArrows(target: UniversalCamera | ArcRotateCameraKeyboardMoveInput) {
    target.keysUp = [38, 87];
    target.keysDown = [40, 83];
    target.keysLeft = [37, 65];
    target.keysRight = [39, 68];
}

function smoothstep(t: number): number {
    const c = Math.max(0, Math.min(1, t));
    return c * c * (3 - 2 * c);
}

function lerpAngle(from: number, to: number, t: number): number {
    let delta = to - from;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return from + delta * t;
}

export const cameraManager = new CameraManager();
