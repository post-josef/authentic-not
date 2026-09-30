import { ArcRotateCamera, ArcRotateCameraKeyboardMoveInput, UniversalCamera, Vector3 } from "@babylonjs/core";
import type { Camera, Observer, Scene } from "@babylonjs/core";

const WALK_POSITION = new Vector3(0, 1.7, -10);
const WALK_BASE_SPEED = 0.2;
const DEFAULT_WALK_ACCEL_MAX_SPEED = 2;
const DEFAULT_WALK_ACCEL_TIME_SEC = 5;
const RESET_MS = 900;
const DOUBLE_TAP_MS = 300;

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
    private lastTap = 0;
    private walkAccelMaxSpeed = DEFAULT_WALK_ACCEL_MAX_SPEED;
    private walkAccelTimeSec = DEFAULT_WALK_ACCEL_TIME_SEC;
    private walkAccelLevel = 0;

    init(scene: Scene, canvas: HTMLCanvasElement) {
        this.dispose();
        this.scene = scene;
        this.canvas = canvas;
        canvas.tabIndex = -1;

        const camera = new UniversalCamera("cam", WALK_POSITION.clone(), scene);
        camera.speed = WALK_BASE_SPEED;
        setCameraArrows(camera);
        camera.keysUpward = [];
        camera.keysDownward = [];
        camera.storeState();
        this.walkSpawn.copyFrom(camera.position);
        this.walkRotation.copyFrom(camera.rotation);

        this.heightObserver = scene.onBeforeRenderObservable.add(() => {
            if (scene.activeCamera !== camera || this.resetObserver) return;
            camera.position.y = WALK_POSITION.y;
            this.tickWalkAcceleration(scene);
        });
        this.walkCam = camera;
        scene.activeCamera = camera;
        this.attachControl();
        canvas.addEventListener("dblclick", this.onDoubleClick);
        canvas.addEventListener("touchend", this.onTouchEnd, { passive: false });
    }

    getCamera(): Camera {
        const camera = this.scene?.activeCamera;
        if (!camera) throw new Error("cameraManager.init(scene, canvas) must be called first");
        return camera;
    }

    setOrbit(
        config: {
            target?: Vector3;
            height?: number;
            distance?: number;
            maxDistance?: number;
            minDistance?: number;
            invertKeys?: boolean;
            arrowsSpeed?: number;
        } = {},
    ) {
        if (!this.scene || !this.canvas) throw new Error("cameraManager.init(scene, canvas) must be called first");

        this.stopReset();
        this.walkCam?.detachControl();
        this.orbitCam?.dispose();

        const target = config.target ?? Vector3.Zero();
        const distance = config.distance ?? 20;

        const camera = new ArcRotateCamera("orbitCam", 0, Math.PI / 3, distance, target, this.scene);
        camera.setPosition(WALK_POSITION.clone());
        camera.radius = distance;
        if (config.height !== undefined) {
            const clamp = Math.max(-1, Math.min(1, (config.height - target.y) / distance));
            camera.beta = Math.acos(clamp);
        }
        camera.lowerRadiusLimit = config.minDistance ?? 2;
        camera.upperRadiusLimit = config.maxDistance ?? 60;
        camera.useInputToRestoreState = false;

        const keyboard = camera.inputs.attached.keyboard as ArcRotateCameraKeyboardMoveInput | undefined;
        if (keyboard) {
            setCameraArrows(keyboard, config.invertKeys ?? false);
            keyboard.angularSpeed = config.arrowsSpeed ?? 0.003;
        }
        camera.storeState();
        this.orbitSpawn = {
            alpha: camera.alpha,
            beta: camera.beta,
            radius: camera.radius,
            target: camera.getTarget().clone(),
        };
        this.orbitCam = camera;
        this.scene.activeCamera = camera;
        this.attachControl();
    }

    resetSceneConfig() {
        this.stopReset();
        this.clearWalkAcceleration();
        this.orbitCam?.dispose();
        this.orbitCam = null;
        this.orbitSpawn = null;
        if (!this.walkCam || !this.scene || !this.canvas) return;
        this.scene.activeCamera = this.walkCam;
        this.attachControl();
        this.walkCam.restoreState();
        this.walkSpawn.copyFrom(this.walkCam.position);
        this.walkRotation.copyFrom(this.walkCam.rotation);
    }

    walkAcceleration(maxSpeed = DEFAULT_WALK_ACCEL_MAX_SPEED, timeToMaxSpeed = DEFAULT_WALK_ACCEL_TIME_SEC) {
        if (!this.walkCam) throw new Error("cameraManager.init(scene, canvas) must be called first");
        if (maxSpeed <= 1) {
            this.walkAccelMaxSpeed = 1;
            this.walkAccelLevel = 0;
            if (this.walkCam) this.walkCam.speed = WALK_BASE_SPEED;
            return;
        }
        this.walkAccelMaxSpeed = maxSpeed;
        this.walkAccelTimeSec = Math.max(0.001, timeToMaxSpeed);
        this.walkAccelLevel = 0;
        if (this.walkCam) this.walkCam.speed = WALK_BASE_SPEED;
    }

    detachControl() {
        this.getCamera().detachControl();
    }

    attachControl() {
        if (!this.canvas) return;
        this.getCamera().attachControl(this.canvas, true);
        this.canvas.focus({ preventScroll: true });
    }

    dispose() {
        this.stopReset();
        this.clearWalkAcceleration();
        if (this.scene && this.heightObserver) {
            this.scene.onBeforeRenderObservable.remove(this.heightObserver);
        }
        this.heightObserver = null;
        this.canvas?.removeEventListener("dblclick", this.onDoubleClick);
        this.canvas?.removeEventListener("touchend", this.onTouchEnd);
        this.walkCam?.dispose();
        this.orbitCam?.dispose();
        this.walkCam = null;
        this.orbitCam = null;
        this.canvas = null;
        this.scene = null;
    }

    private readonly onDoubleClick = () => this.resetCamera();

    private readonly onTouchEnd = (e: TouchEvent) => {
        const now = Date.now();
        if (now - this.lastTap < DOUBLE_TAP_MS) {
            e.preventDefault();
            this.resetCamera();
        }
        this.lastTap = now;
    };

    private resetCamera() {
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
    }

    private stopReset() {
        if (this.scene && this.resetObserver) {
            this.scene.onBeforeRenderObservable.remove(this.resetObserver);
        }
        this.resetObserver = null;
    }

    private clearWalkAcceleration() {
        this.walkAccelMaxSpeed = DEFAULT_WALK_ACCEL_MAX_SPEED;
        this.walkAccelTimeSec = DEFAULT_WALK_ACCEL_TIME_SEC;
        this.walkAccelLevel = 0;
        if (this.walkCam) this.walkCam.speed = WALK_BASE_SPEED;
    }

    private tickWalkAcceleration(scene: Scene) {
        const camera = this.walkCam;
        if (!camera || this.walkAccelMaxSpeed <= 1) return;

        if (!isWalkTranslating(camera)) {
            this.walkAccelLevel = 0;
            camera.speed = WALK_BASE_SPEED;
            return;
        }
        const step = scene.getEngine().getDeltaTime() / 1000 / this.walkAccelTimeSec;
        this.walkAccelLevel = Math.min(1, this.walkAccelLevel + step);
        camera.speed = WALK_BASE_SPEED * (1 + this.walkAccelLevel * (this.walkAccelMaxSpeed - 1));
    }
}

type WalkKeyboardInput = { _keys: number[] };
type WalkTouchInput = {
    _pointerPressed: number[];
    singleFingerRotate: boolean;
    _offsetX: number | null;
    _offsetY: number | null;
};

function isWalkTranslating(camera: UniversalCamera): boolean {
    const keyboard = camera.inputs.attached.keyboard as unknown as WalkKeyboardInput | undefined;
    if (keyboard?._keys.length) {
        const movementKeys = [...camera.keysUp, ...camera.keysDown, ...camera.keysLeft, ...camera.keysRight];
        for (const code of keyboard._keys) {
            if (movementKeys.includes(code)) return true;
        }
    }

    const touch = camera.inputs.attached.touch as unknown as WalkTouchInput | undefined;
    if (!touch?._pointerPressed.length) return false;
    const rotateCamera =
        (touch.singleFingerRotate && touch._pointerPressed.length === 1) ||
        (!touch.singleFingerRotate && touch._pointerPressed.length > 1);
    return (
        !rotateCamera &&
        touch._offsetX !== null &&
        touch._offsetY !== null &&
        (touch._offsetX !== 0 || touch._offsetY !== 0)
    );
}

function setCameraArrows(target: UniversalCamera | ArcRotateCameraKeyboardMoveInput, invert = false) {
    if (invert) {
        target.keysUp = [40, 83];
        target.keysDown = [38, 87];
        target.keysLeft = [39, 68];
        target.keysRight = [37, 65];
        return;
    }
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
