import {
    ArcRotateCamera,
    ArcRotateCameraKeyboardMoveInput,
    KeyboardEventTypes,
    Ray,
    StandardMaterial,
    UniversalCamera,
    Vector3,
} from "@babylonjs/core";
import type { AbstractEngine, AbstractMesh, Camera, KeyboardInfo, Observer, Scene } from "@babylonjs/core";

const WALK_POSITION = new Vector3(0, 1.7, -10);
const WALK_BASE_SPEED = 0.2;
const DEFAULT_WALK_ACCEL_MAX_SPEED = 2;
const DEFAULT_WALK_ACCEL_TIME_SEC = 5;
const DEFAULT_ORBIT_ARROW_SPEED = 0.003;
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
    private shiftHeld = false;
    private shiftObserver: Observer<KeyboardInfo> | null = null;
    private canvasBlurObserver: Observer<AbstractEngine> | null = null;
    private orbitArrowSpeed = DEFAULT_ORBIT_ARROW_SPEED;
    private walkJoystick: HTMLDivElement | null = null;
    private walkJoystickPointerId: number | null = null;
    private walkJoystickOriginX = 0;
    private walkJoystickOriginY = 0;
    private groundMeshes: AbstractMesh[] = [];
    private groundDifference = 0;

    init(scene: Scene, canvas: HTMLCanvasElement) {
        this.dispose();
        this.scene = scene;
        this.canvas = canvas;

        const camera = new UniversalCamera("cam", WALK_POSITION.clone(), scene);
        camera.speed = WALK_BASE_SPEED;
        camera.touchAngularSensibility /= 2.2;
        camera.touchMoveSensibility /= 1.4;
        setCameraArrows(camera);
        camera.keysUpward = [];
        camera.keysDownward = [];

        const engine = scene.getEngine();
        this.shiftObserver = scene.onKeyboardObservable.add((info) => {
            if (info.event.key === "Shift") this.shiftHeld = info.type === KeyboardEventTypes.KEYDOWN;
        });
        this.canvasBlurObserver = engine.onCanvasBlurObservable.add(() => {
            this.shiftHeld = false;
        });

        this.heightObserver = scene.onBeforeRenderObservable.add(() => {
            if (!this.resetObserver) this.syncActiveCamera(scene);
        });
        this.walkCam = camera;
        this.resetSceneConfig();
        canvas.addEventListener("dblclick", this.onDoubleClick);
        canvas.addEventListener("touchend", this.onTouchEnd, { passive: false });
        if (matchMedia("(hover: none) and (pointer: coarse)").matches) {
            const root = document.createElement("div");
            root.className = "walk-touch-joystick";
            root.hidden = true;
            document.body.append(root);
            this.walkJoystick = root;
            canvas.addEventListener("pointerdown", this.onWalkJoystickPointerDown);
            canvas.addEventListener("pointermove", this.onWalkJoystickPointerMove);
            canvas.addEventListener("pointerup", this.onWalkJoystickPointerUp);
            canvas.addEventListener("pointercancel", this.onWalkJoystickPointerUp);
        }
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

        this.resetSceneConfig();
        this.walkCam?.detachControl();

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
            this.orbitArrowSpeed = config.arrowsSpeed ?? DEFAULT_ORBIT_ARROW_SPEED;
            keyboard.angularSpeed = this.orbitArrowSpeed;
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
        this.groundMeshes = [];
        this.groundDifference = 0;
        this.orbitCam?.dispose();
        this.orbitCam = this.orbitSpawn = null;
        if (!this.walkCam || !this.scene || !this.canvas) return;
        this.walkPosition(WALK_POSITION);
        this.walkRotation.setAll(0);
        this.walkCam.rotation.setAll(0);
        this.scene.activeCamera = this.walkCam;
        this.attachControl();
    }

    walkPosition(position: Vector3) {
        if (!this.walkCam) throw new Error("cameraManager.init(scene, canvas) must be called first");
        this.walkCam.position.copyFrom(position);
        this.walkCam.storeState();
        this.walkSpawn.copyFrom(position);
    }

    walkAcceleration(maxSpeed = DEFAULT_WALK_ACCEL_MAX_SPEED, timeToMaxSpeed = DEFAULT_WALK_ACCEL_TIME_SEC) {
        if (!this.walkCam) throw new Error("cameraManager.init(scene, canvas) must be called first");
        this.walkAccelMaxSpeed = maxSpeed <= 1 ? 1 : maxSpeed;
        if (maxSpeed > 1) this.walkAccelTimeSec = Math.max(0.001, timeToMaxSpeed);
        this.walkAccelLevel = 0;
        this.walkCam.speed = WALK_BASE_SPEED;
    }

    walkGround(mesh: AbstractMesh, invisible?: boolean) {
        this.groundMeshes = [mesh, ...mesh.getChildMeshes()];
        if (invisible) {
            const invisibleMaterial = new StandardMaterial("invisibleMaterial", mesh.getScene());
            invisibleMaterial.alpha = 0;
            this.groundMeshes.forEach((part) => (part.material = invisibleMaterial));
        }
        for (const part of this.groundMeshes) {
            part.computeWorldMatrix(true); // wait for the meshes to calculate the ground difference correctly
        }
        this.groundDifference = this.groundSurfaceY(this.walkSpawn.x, this.walkSpawn.z) ?? 0;
    }

    private groundSurfaceY(x: number, z: number): number | null {
        if (!this.groundMeshes.length) return null;
        const ray = new Ray(new Vector3(x, 1000, z), Vector3.Down(), 2000);
        let surfaceY: number | null = null;
        let bestDist = Infinity;
        for (const mesh of this.groundMeshes) {
            const hit = ray.intersectsMesh(mesh, true);
            if (hit.hit && hit.pickedPoint && hit.distance < bestDist) {
                bestDist = hit.distance;
                surfaceY = hit.pickedPoint.y;
            }
        }
        return surfaceY;
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
        const engine = this.scene?.getEngine();
        if (this.heightObserver) this.scene?.onBeforeRenderObservable.remove(this.heightObserver);
        if (this.shiftObserver) this.scene?.onKeyboardObservable.remove(this.shiftObserver);
        if (this.canvasBlurObserver) engine?.onCanvasBlurObservable.remove(this.canvasBlurObserver);
        this.heightObserver = this.shiftObserver = this.canvasBlurObserver = null;
        this.shiftHeld = false;
        const canvas = this.canvas;
        if (canvas) {
            canvas.removeEventListener("pointerdown", this.onWalkJoystickPointerDown);
            canvas.removeEventListener("pointermove", this.onWalkJoystickPointerMove);
            canvas.removeEventListener("pointerup", this.onWalkJoystickPointerUp);
            canvas.removeEventListener("pointercancel", this.onWalkJoystickPointerUp);
            canvas.removeEventListener("dblclick", this.onDoubleClick);
            canvas.removeEventListener("touchend", this.onTouchEnd);
        }
        this.walkJoystick?.remove();
        this.walkJoystickPointerId = this.walkJoystick = null;
        this.resetSceneConfig();
        this.walkCam?.dispose();
        this.walkCam = this.canvas = this.scene = null;
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

    private hideWalkJoystick() {
        const root = this.walkJoystick;
        if (!root) return;
        root.hidden = true;
        this.walkJoystickPointerId = null;
        root.style.removeProperty("--x");
        root.style.removeProperty("--y");
    }

    private readonly onWalkJoystickPointerDown = (e: PointerEvent) => {
        if (e.pointerType !== "touch" || this.scene?.activeCamera !== this.walkCam) return;
        if (this.walkJoystickPointerId !== null && e.pointerId !== this.walkJoystickPointerId) {
            this.hideWalkJoystick();
            return;
        }
        const touch = this.walkCam?.inputs.attached.touch as unknown as WalkTouchInput | undefined;
        if (!touch || isTouchRotateGesture(touch)) {
            if (touch && touch._pointerPressed.length > 1) this.hideWalkJoystick();
            return;
        }
        this.walkJoystickPointerId = e.pointerId;
        this.walkJoystickOriginX = e.clientX;
        this.walkJoystickOriginY = e.clientY;
    };

    private readonly onWalkJoystickPointerMove = (e: PointerEvent) => {
        const root = this.walkJoystick;
        if (!root || e.pointerId !== this.walkJoystickPointerId || this.scene?.activeCamera !== this.walkCam) return;
        const dx = e.clientX - this.walkJoystickOriginX;
        const dy = e.clientY - this.walkJoystickOriginY;
        if (root.hidden) {
            if (dx * dx + dy * dy < 64) return;
            root.style.left = `${this.walkJoystickOriginX}px`;
            root.style.top = `${this.walkJoystickOriginY}px`;
            root.hidden = false;
        }
        let sx = dx;
        let sy = dy;
        const len = Math.hypot(sx, sy);
        if (len > 28) {
            const s = 28 / len;
            sx *= s;
            sy *= s;
        }
        root.style.setProperty("--x", `${sx}px`);
        root.style.setProperty("--y", `${sy}px`);
    };

    private readonly onWalkJoystickPointerUp = (e: PointerEvent) => {
        if (e.pointerId !== this.walkJoystickPointerId) return;
        this.hideWalkJoystick();
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

    private syncActiveCamera(scene: Scene) {
        const active = scene.activeCamera;
        if (active === this.orbitCam) {
            const keyboard = this.orbitCam?.inputs.attached.keyboard as ArcRotateCameraKeyboardMoveInput | undefined;
            if (keyboard) keyboard.angularSpeed = this.orbitArrowSpeed * (this.shiftHeld ? 2 : 1);
            return;
        }

        const camera = this.walkCam;
        if (active !== camera || !camera) return;

        if (this.groundMeshes.length) {
            const surfaceY = this.groundSurfaceY(camera.position.x, camera.position.z);
            camera.position.y =
                surfaceY === null ? this.walkSpawn.y : surfaceY - this.groundDifference + this.walkSpawn.y;
        } else {
            camera.position.y = this.walkSpawn.y;
        }

        if (!isWalkTranslating(camera)) {
            this.walkAccelLevel = 0;
            camera.speed = WALK_BASE_SPEED;
            return;
        }
        if (this.walkAccelMaxSpeed > 1) {
            const step = scene.getEngine().getDeltaTime() / 1000 / this.walkAccelTimeSec;
            this.walkAccelLevel = Math.min(1, this.walkAccelLevel + step);
        }
        const speed =
            this.walkAccelMaxSpeed > 1
                ? WALK_BASE_SPEED * (1 + this.walkAccelLevel * (this.walkAccelMaxSpeed - 1))
                : WALK_BASE_SPEED;
        camera.speed = speed * (this.shiftHeld ? 2 : 1);
    }
}

type CameraArrowKeys = Pick<UniversalCamera, "keysUp" | "keysDown" | "keysLeft" | "keysRight">;
type KeyboardMoveInput = { _keys: number[] };
type WalkTouchInput = {
    _pointerPressed: number[];
    singleFingerRotate: boolean;
    _offsetX: number | null;
    _offsetY: number | null;
};

function isKeyboardMoving(keys: CameraArrowKeys, pressed: number[]): boolean {
    if (!pressed.length) return false;
    const movementKeys = [...keys.keysUp, ...keys.keysDown, ...keys.keysLeft, ...keys.keysRight];
    return pressed.some((code) => movementKeys.includes(code));
}

function isWalkTranslating(camera: UniversalCamera): boolean {
    const keyboard = camera.inputs.attached.keyboard as unknown as KeyboardMoveInput | undefined;
    if (keyboard && isKeyboardMoving(camera, keyboard._keys)) return true;

    const touch = camera.inputs.attached.touch as unknown as WalkTouchInput | undefined;
    if (!touch?._pointerPressed.length || isTouchRotateGesture(touch)) return false;
    return touch._offsetX !== null && touch._offsetY !== null && (touch._offsetX !== 0 || touch._offsetY !== 0);
}

function isTouchRotateGesture(touch: WalkTouchInput): boolean {
    const n = touch._pointerPressed.length;
    return (touch.singleFingerRotate && n === 1) || (!touch.singleFingerRotate && n > 1);
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
