import {
    ArcRotateCamera,
    ArcRotateCameraKeyboardMoveInput,
    Axis,
    Color3,
    FreeCameraKeyboardMoveInput,
    PointLight,
    SpotLight,
    Space,
    UniversalCamera,
    Vector3,
    type AbstractMesh,
    type Camera,
    type Light,
    type Observer,
    type Scene,
} from "@babylonjs/core";

export type Vec3 = [number, number, number];
export type Color3Value = [number, number, number];

export interface CameraHeadlightConfig {
    mode: "none" | "spot" | "point";
    intensity?: number;
    range?: number;
    color?: Color3Value;
    angle?: number;
    exponent?: number;
    offset?: Vec3;
}

export interface CameraConfig {
    position?: Vec3;
    rotation?: Vec3;
    speed?: number;
    walkHeight?: number;
    headlight?: CameraHeadlightConfig;
}

const DEFAULT_WALK_HEIGHT = 1.7;
const DEFAULT_SPEED = 0.2;
const ORBIT_ANGULAR_SPEED = 0.005;
const RESET_ANIMATION_MS = 900;
const DEFAULT_WALK_POSITION = new Vector3(0, DEFAULT_WALK_HEIGHT, -10);
const CAMERA_KEYS = {
    up: [38, 87],
    down: [40, 83],
    left: [37, 65],
    right: [39, 68],
} as const;

function smoothstep(t: number): number {
    const c = Math.max(0, Math.min(1, t));
    return c * c * (3 - 2 * c);
}

function toVector3(point: Vec3): Vector3 {
    return new Vector3(...point);
}

function orbitAnglesFromOffset(offset: Vector3): { alpha: number; beta: number } {
    const radius = offset.length();
    if (radius < 1e-6) return { alpha: 0, beta: Math.PI / 3 };
    return {
        alpha: Math.atan2(offset.x, offset.z),
        beta: Math.acos(Math.max(-1, Math.min(1, offset.y / radius))),
    };
}

export class CameraManager {
    private scene: Scene | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private walkCam: UniversalCamera | null = null;
    private orbitCam: ArcRotateCamera | null = null;
    private mode: "walk" | "orbit" = "walk";
    private isInteractionBlocked: () => boolean = () => false;
    private doubleClickHandler: ((event: MouseEvent) => void) | null = null;

    private walkHeight = DEFAULT_WALK_HEIGHT;
    private spawnPosition = DEFAULT_WALK_POSITION.clone();
    private spawnRotation = Vector3.Zero();
    private orbitSpawn = {
        target: Vector3.Zero(),
        alpha: 0,
        beta: Math.PI / 3,
        radius: DEFAULT_WALK_POSITION.length(),
    };
    private headlight: Light | null = null;
    private headlightOffset = new Vector3(0, 0, 0.2);
    private heightObserver: Observer<Scene> | null = null;
    private headlightObserver: Observer<Scene> | null = null;
    private resetObserver: Observer<Scene> | null = null;

    init(scene: Scene, canvas: HTMLCanvasElement, options: { isInteractionBlocked?: () => boolean } = {}): void {
        this.dispose();
        this.scene = scene;
        this.canvas = canvas;
        this.isInteractionBlocked = options.isInteractionBlocked ?? (() => false);
        this.mode = "walk";
        this.walkCam = this.createWalkCamera();
        scene.activeCamera = this.walkCam;
        this.bindDoubleClick();
    }

    getCamera(): Camera {
        return this.getActiveCamera();
    }

    configure(config: CameraConfig = {}): void {
        this.setWalkMode(config);
    }

    resetSceneConfig(): void {
        this.configure();
    }

    setOrbit(target: Vec3, distance?: number): void {
        const targetVec = toVector3(target);
        const offset = DEFAULT_WALK_POSITION.subtract(targetVec);
        const radius = distance ?? offset.length();
        const direction = offset.length() > 1e-6 ? offset.normalize() : new Vector3(0, 0, -1);
        const { alpha, beta } = orbitAnglesFromOffset(direction.scale(radius));
        this.orbitSpawn = { target: targetVec.clone(), alpha, beta, radius };
        this.switchToOrbit();
    }

    setHeadlight(config: CameraHeadlightConfig | null): void {
        const scene = this.requireScene();
        const camera = this.getActiveCamera();
        this.disposeHeadlight();
        if (!config || config.mode === "none") return;

        const color = config.color ?? [1, 0.95, 0.85];
        const offset = config.offset ?? [0, 0, 0.2];
        this.headlightOffset.set(...offset);

        if (config.mode === "point") {
            const light = new PointLight("cameraHeadlight", camera.position.clone(), scene);
            light.intensity = config.intensity ?? 0.6;
            light.range = config.range ?? 12;
            light.diffuse = new Color3(...color);
            this.headlight = light;
        } else {
            const light = new SpotLight(
                "cameraHeadlight",
                camera.position.clone(),
                camera.getDirection(Vector3.Forward()),
                config.angle ?? Math.PI / 3,
                config.exponent ?? 2,
                scene,
            );
            light.intensity = config.intensity ?? 0.85;
            light.range = config.range ?? 18;
            light.diffuse = new Color3(...color);
            this.headlight = light;
        }

        this.headlightObserver = scene.onBeforeRenderObservable.add(() => this.syncHeadlight());
        this.syncHeadlight();
    }

    detachControl(): void {
        this.getActiveCamera().detachControl();
    }

    attachControl(): void {
        if (this.canvas) this.getActiveCamera().attachControl(this.canvas, true);
    }

    faceMeshToCamera(mesh: AbstractMesh): void {
        mesh.lookAt(this.getActiveCamera().position);
        mesh.rotate(Axis.Y, Math.PI, Space.LOCAL);
    }

    dispose(): void {
        this.stopReset();
        this.disposeHeadlight();
        if (this.scene && this.heightObserver) {
            this.scene.onBeforeRenderObservable.remove(this.heightObserver);
        }
        this.heightObserver = null;
        if (this.canvas && this.doubleClickHandler) {
            this.canvas.removeEventListener("dblclick", this.doubleClickHandler, { capture: true });
        }
        this.doubleClickHandler = null;
        this.walkCam?.dispose();
        this.walkCam = null;
        this.orbitCam?.dispose();
        this.orbitCam = null;
        this.canvas = null;
        this.scene = null;
        this.mode = "walk";
    }

    private getActiveCamera(): Camera {
        if (this.mode === "orbit") {
            if (!this.orbitCam) throw new Error("Orbit camera is unavailable");
            return this.orbitCam;
        }
        if (!this.walkCam) throw new Error("cameraManager.init(scene, canvas) must be called first");
        return this.walkCam;
    }

    private setWalkMode(config: CameraConfig): void {
        const scene = this.requireScene();
        this.orbitCam?.detachControl();
        this.orbitCam?.dispose();
        this.orbitCam = null;
        this.mode = "walk";
        if (!this.walkCam) throw new Error("Walk camera is unavailable");
        scene.activeCamera = this.walkCam;

        this.walkHeight = config.walkHeight ?? DEFAULT_WALK_HEIGHT;
        this.spawnPosition = config.position ? toVector3(config.position) : new Vector3(0, this.walkHeight, -10);
        this.spawnPosition.y = this.walkHeight;
        this.spawnRotation = config.rotation ? toVector3(config.rotation) : Vector3.Zero();
        this.walkCam.speed = config.speed ?? DEFAULT_SPEED;
        this.setHeadlight(config.headlight ?? { mode: "none" });
        if (this.canvas) this.walkCam.attachControl(this.canvas, true);
        this.resetWalk(true);
    }

    private switchToOrbit(): void {
        const scene = this.requireScene();
        this.walkCam?.detachControl();
        this.orbitCam?.dispose();

        const camera = new ArcRotateCamera(
            "orbitCam",
            this.orbitSpawn.alpha,
            this.orbitSpawn.beta,
            this.orbitSpawn.radius,
            this.orbitSpawn.target,
            scene,
        );
        camera.lowerRadiusLimit = this.orbitSpawn.radius * 0.4;
        camera.upperRadiusLimit = this.orbitSpawn.radius * 2.5;
        if (this.canvas) camera.attachControl(this.canvas, true);
        this.configureOrbitKeyboard(camera);

        this.orbitCam = camera;
        this.mode = "orbit";
        scene.activeCamera = camera;
    }

    private reset(instant: boolean): void {
        if (this.mode === "orbit") this.resetOrbit(instant);
        else this.resetWalk(instant);
    }

    private resetWalk(instant: boolean): void {
        const camera = this.walkCam;
        if (!camera) return;
        const scene = this.requireScene();
        this.stopReset();

        if (instant) {
            camera.position.copyFrom(this.spawnPosition);
            camera.rotation.copyFrom(this.spawnRotation);
            this.syncHeadlight();
            return;
        }

        const fromPosition = camera.position.clone();
        const fromRotation = camera.rotation.clone();
        const startedAt = performance.now();
        this.resetObserver = scene.onBeforeRenderObservable.add(() => {
            const t = smoothstep((performance.now() - startedAt) / RESET_ANIMATION_MS);
            Vector3.LerpToRef(fromPosition, this.spawnPosition, t, camera.position);
            Vector3.LerpToRef(fromRotation, this.spawnRotation, t, camera.rotation);
            this.syncHeadlight();
            if (t >= 1) this.stopReset();
        });
    }

    private resetOrbit(instant: boolean): void {
        const camera = this.orbitCam;
        if (!camera) return;
        const scene = this.requireScene();
        this.stopReset();

        if (instant) {
            camera.setTarget(this.orbitSpawn.target);
            camera.alpha = this.orbitSpawn.alpha;
            camera.beta = this.orbitSpawn.beta;
            camera.radius = this.orbitSpawn.radius;
            this.syncHeadlight();
            return;
        }

        const fromAlpha = camera.alpha;
        const fromBeta = camera.beta;
        const fromRadius = camera.radius;
        const startedAt = performance.now();
        this.resetObserver = scene.onBeforeRenderObservable.add(() => {
            const t = smoothstep((performance.now() - startedAt) / RESET_ANIMATION_MS);
            camera.alpha = fromAlpha + (this.orbitSpawn.alpha - fromAlpha) * t;
            camera.beta = fromBeta + (this.orbitSpawn.beta - fromBeta) * t;
            camera.radius = fromRadius + (this.orbitSpawn.radius - fromRadius) * t;
            camera.setTarget(this.orbitSpawn.target);
            this.syncHeadlight();
            if (t >= 1) this.stopReset();
        });
    }

    private requireScene(): Scene {
        if (!this.scene) throw new Error("cameraManager.init(scene, canvas) must be called first");
        return this.scene;
    }

    private createWalkCamera(): UniversalCamera {
        const scene = this.requireScene();
        if (!this.canvas) throw new Error("Camera canvas is unavailable");
        const camera = new UniversalCamera("cam", this.spawnPosition.clone(), scene);
        camera.speed = DEFAULT_SPEED;
        camera.inputs.removeByType("FreeCameraKeyboardMoveInput");
        const keyboard = new FreeCameraKeyboardMoveInput();
        keyboard.keysUp = [...CAMERA_KEYS.up];
        keyboard.keysDown = [...CAMERA_KEYS.down];
        keyboard.keysLeft = [...CAMERA_KEYS.left];
        keyboard.keysRight = [...CAMERA_KEYS.right];
        keyboard.keysUpward = [];
        keyboard.keysDownward = [];
        camera.inputs.add(keyboard);
        camera.attachControl(this.canvas, true);
        this.heightObserver = scene.onBeforeRenderObservable.add(() => {
            if (this.mode !== "walk" || !this.walkCam || this.resetObserver) return;
            this.walkCam.position.y = this.walkHeight;
        });
        return camera;
    }

    private configureOrbitKeyboard(camera: ArcRotateCamera): void {
        const keyboard = camera.inputs.attached.keyboard as ArcRotateCameraKeyboardMoveInput | undefined;
        if (!keyboard) return;
        keyboard.keysUp = [...CAMERA_KEYS.up];
        keyboard.keysDown = [...CAMERA_KEYS.down];
        keyboard.keysLeft = [...CAMERA_KEYS.left];
        keyboard.keysRight = [...CAMERA_KEYS.right];
        keyboard.angularSpeed = ORBIT_ANGULAR_SPEED;
    }

    private bindDoubleClick(): void {
        if (!this.canvas) return;
        this.doubleClickHandler = (event) => {
            if (this.isInteractionBlocked() || this.pickedMeshHasClickHandler(event)) return;
            this.reset(false);
        };
        this.canvas.addEventListener("dblclick", this.doubleClickHandler, { capture: true });
    }

    private pickedMeshHasClickHandler(event: MouseEvent): boolean {
        const pick = this.pickAt(event);
        if (!pick?.hit || !pick.pickedMesh) return false;
        for (let mesh: AbstractMesh | null = pick.pickedMesh; mesh; mesh = mesh.parent as AbstractMesh | null) {
            if (mesh.metadata?.clickable) return true;
        }
        return false;
    }

    private pickAt(event: MouseEvent) {
        const scene = this.requireScene();
        if (!this.canvas) return null;
        const rect = this.canvas.getBoundingClientRect();
        const engine = scene.getEngine();
        const x = ((event.clientX - rect.left) / rect.width) * engine.getRenderWidth();
        const y = ((event.clientY - rect.top) / rect.height) * engine.getRenderHeight();
        return scene.pick(x, y);
    }

    private syncHeadlight(): void {
        const camera = this.getActiveCamera();
        if (!this.headlight) return;
        const forward = camera.getDirection(Vector3.Forward());
        const right = camera.getDirection(Vector3.Right());
        const up = camera.getDirection(Vector3.Up());
        const position = camera.position
            .add(right.scale(this.headlightOffset.x))
            .add(up.scale(this.headlightOffset.y))
            .add(forward.scale(this.headlightOffset.z));

        if (this.headlight instanceof SpotLight) {
            this.headlight.position.copyFrom(position);
            this.headlight.direction.copyFrom(forward);
        } else if (this.headlight instanceof PointLight) {
            this.headlight.position.copyFrom(position);
        }
    }

    private stopReset(): void {
        if (this.scene && this.resetObserver) {
            this.scene.onBeforeRenderObservable.remove(this.resetObserver);
        }
        this.resetObserver = null;
    }

    private disposeHeadlight(): void {
        if (this.scene && this.headlightObserver) {
            this.scene.onBeforeRenderObservable.remove(this.headlightObserver);
        }
        this.headlightObserver = null;
        this.headlight?.dispose();
        this.headlight = null;
    }
}

export const cameraManager = new CameraManager();
