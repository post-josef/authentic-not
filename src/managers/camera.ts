import {
    Color3,
    FreeCameraKeyboardMoveInput,
    PointLight,
    SpotLight,
    UniversalCamera,
    Vector3,
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
const RESET_ANIMATION_MS = 900;

function smoothstep(t: number): number {
    const c = Math.max(0, Math.min(1, t));
    return c * c * (3 - 2 * c);
}

function vector(value: Vec3 | undefined, fallback: Vector3): Vector3 {
    return value ? new Vector3(...value) : fallback.clone();
}

export class CameraManager {
    private scene: Scene | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private camera: UniversalCamera | null = null;
    private isInteractionBlocked: () => boolean = () => false;
    private doubleClickHandler: ((event: MouseEvent) => void) | null = null;

    private walkHeight = DEFAULT_WALK_HEIGHT;
    private spawnPosition = new Vector3(0, DEFAULT_WALK_HEIGHT, -10);
    private spawnRotation = Vector3.Zero();
    private headlight: Light | null = null;
    private headlightOffset = new Vector3(0, 0, 0.2);
    private heightObserver: Observer<Scene> | null = null;
    private headlightObserver: Observer<Scene> | null = null;
    private resetObserver: Observer<Scene> | null = null;

    init(
        scene: Scene,
        canvas: HTMLCanvasElement,
        options: { isInteractionBlocked?: () => boolean } = {},
    ): void {
        this.dispose();
        this.scene = scene;
        this.canvas = canvas;
        this.isInteractionBlocked = options.isInteractionBlocked ?? (() => false);
        this.camera = this.createWalkCamera();
        this.bindDoubleClick();
    }

    getCamera(): UniversalCamera {
        if (!this.camera) throw new Error("cameraManager.init(scene, canvas) must be called first");
        return this.camera;
    }

    configure(config: CameraConfig = {}): void {
        const camera = this.getCamera();
        this.walkHeight = config.walkHeight ?? DEFAULT_WALK_HEIGHT;
        this.spawnPosition = vector(config.position, new Vector3(0, this.walkHeight, -10));
        this.spawnPosition.y = this.walkHeight;
        this.spawnRotation = vector(config.rotation, Vector3.Zero());
        camera.speed = config.speed ?? DEFAULT_SPEED;
        this.setHeadlight(config.headlight ?? { mode: "none" });
        this.reset(true);
    }

    resetSceneConfig(): void {
        this.configure();
    }

    setHeadlight(config: CameraHeadlightConfig | null): void {
        const scene = this.requireScene();
        const camera = this.getCamera();
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
        this.camera?.detachControl();
    }

    attachControl(): void {
        if (this.camera && this.canvas) this.camera.attachControl(this.canvas, true);
    }

    reset(instant: boolean): void {
        const camera = this.getCamera();
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

    dispose(): void {
        this.stopReset();
        this.disposeHeadlight();
        if (this.scene && this.heightObserver) {
            this.scene.onBeforeRenderObservable.remove(this.heightObserver);
        }
        this.heightObserver = null;
        if (this.canvas && this.doubleClickHandler) {
            this.canvas.removeEventListener("dblclick", this.doubleClickHandler);
        }
        this.doubleClickHandler = null;
        this.camera?.dispose();
        this.camera = null;
        this.canvas = null;
        this.scene = null;
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
        keyboard.keysUp = [38, 87];
        keyboard.keysDown = [40, 83];
        keyboard.keysLeft = [37, 65];
        keyboard.keysRight = [39, 68];
        keyboard.keysUpward = [];
        keyboard.keysDownward = [];
        camera.inputs.add(keyboard);
        camera.attachControl(this.canvas, true);
        this.heightObserver = scene.onBeforeRenderObservable.add(() => {
            if (!this.resetObserver) camera.position.y = this.walkHeight;
        });
        return camera;
    }

    private bindDoubleClick(): void {
        if (!this.canvas) return;
        this.doubleClickHandler = (event) => {
            if (this.isInteractionBlocked() || this.pickHitPickableMesh(event)) return;
            this.reset(false);
        };
        this.canvas.addEventListener("dblclick", this.doubleClickHandler);
    }

    private pickHitPickableMesh(event: MouseEvent): boolean {
        const scene = this.requireScene();
        if (!this.canvas) return false;
        const rect = this.canvas.getBoundingClientRect();
        const engine = scene.getEngine();
        const x = ((event.clientX - rect.left) / rect.width) * engine.getRenderWidth();
        const y = ((event.clientY - rect.top) / rect.height) * engine.getRenderHeight();
        const pick = scene.pick(x, y);
        return Boolean(pick?.hit && pick.pickedMesh?.isPickable);
    }

    private syncHeadlight(): void {
        if (!this.headlight || !this.camera) return;
        const forward = this.camera.getDirection(Vector3.Forward());
        const right = this.camera.getDirection(Vector3.Right());
        const up = this.camera.getDirection(Vector3.Up());
        const position = this.camera.position
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
