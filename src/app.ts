import {
    Engine,
    Scene,
    UniversalCamera,
    Vector3,
    HemisphericLight,
    MeshBuilder,
    StandardMaterial,
    Color3,
    Color4,
    Texture,
    ActionManager,
    ExecuteCodeAction,
    AbstractMesh,
} from "@babylonjs/core";
import { AdvancedDynamicTexture, Rectangle, StackPanel, TextBlock, Image, Button, Control } from "@babylonjs/gui";

interface GalleryItem {
    title: string;
    img: string;
    x: number;
    r: number;
    text: string;
}

interface WindowConfig {
    color: string;
    left: string;
    top: string;
}

const WINDOW_CONFIGS: WindowConfig[] = [
    { color: "#2E6F40", left: "-320px", top: "140px" },
    { color: "#8B2635", left: "-250px", top: "-120px" },
    { color: "#5A2D82", left: "0px", top: "0px" },
    { color: "#1F4E79", left: "220px", top: "-80px" },
    { color: "#7A5C00", left: "260px", top: "120px" },
];

const GALLERY_ITEMS: GalleryItem[] = [
    { title: "Image One", img: "images/pic1.png", x: -6, r: 0.3, text: "Red themed popup." },
    { title: "Image Two", img: "images/pic2.png", x: -3, r: 0.15, text: "Blue themed popup." },
    { title: "Image Three", img: "images/pic3.png", x: 0, r: 0, text: "Green themed popup." },
    { title: "Image Four", img: "images/pic4.png", x: 3, r: -0.15, text: "Gold themed popup." },
    { title: "Image Five", img: "images/pic5.png", x: 6, r: -0.3, text: "Purple themed popup." },
];

const PLANE_WIDTH = 2.3;
const PLANE_HEIGHT = 3.2;
const BORDER_WIDTH = 0.04;

export class App {
    engine: Engine | null = null;
    scene: Scene | null = null;

    private canvas: HTMLCanvasElement | null = null;
    private camera: UniversalCamera | null = null;
    private ui: AdvancedDynamicTexture | null = null;
    private galleryMeshes: AbstractMesh[] = [];
    private modalOpen = false;
    private modalControls: Control[] = [];

    init(): void {
        const canvas = document.getElementById("canvas");
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error("Canvas element not found");
        }

        this.canvas = canvas;
        this.engine = new Engine(canvas, true);
        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0.05, 0.05, 0.08, 1);

        this.camera = new UniversalCamera("cam", new Vector3(0, 1.7, -10), this.scene);
        this.camera.attachControl(canvas, true);

        new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);

        this.ui = AdvancedDynamicTexture.CreateFullscreenUI("ui");
        this.createGallery();

        this.engine.runRenderLoop(() => {
            this.scene?.render();
            this.updateFps();
        });
    }

    private createGallery(): void {
        if (!this.scene) return;

        GALLERY_ITEMS.forEach((item, index) => {
            this.createImagePlane(index, item);
        });

        this.scene.onBeforeRenderObservable.add(() => {
            const t = performance.now() * 0.001;
            this.galleryMeshes.forEach((mesh, i) => {
                mesh.position.y = 1.8 + Math.sin(t * 1.4 + i) * 0.15;
            });
        });
    }

    private createImagePlane(index: number, data: GalleryItem): void {
        if (!this.scene) return;

        const plane = MeshBuilder.CreatePlane(data.title, { width: PLANE_WIDTH, height: PLANE_HEIGHT }, this.scene);
        plane.position.set(data.x, 1.8, 5);
        plane.rotation.y = data.r;

        const mat = new StandardMaterial(`${data.title}Mat`, this.scene);
        mat.diffuseTexture = new Texture(data.img, this.scene);
        mat.opacityTexture = mat.diffuseTexture;
        mat.emissiveColor = new Color3(1, 1, 1);
        mat.backFaceCulling = false;
        plane.material = mat;

        const border = MeshBuilder.CreatePlane(
            `${data.title}Border`,
            { width: PLANE_WIDTH + BORDER_WIDTH * 2, height: PLANE_HEIGHT + BORDER_WIDTH * 2 },
            this.scene,
        );
        border.parent = plane;
        border.position.z = -0.005;

        const borderMat = new StandardMaterial(`${data.title}BorderMat`, this.scene);
        borderMat.emissiveColor = Color3.White();
        borderMat.disableLighting = true;
        borderMat.backFaceCulling = false;
        border.material = borderMat;
        border.isVisible = false;
        border.isPickable = false;
        border.renderingGroupId = 0;
        plane.renderingGroupId = 1;

        plane.metadata = { border };

        plane.actionManager = new ActionManager(this.scene);
        plane.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
                if (this.modalOpen) return;
                this.setHighlight(plane, true);
            }),
        );
        plane.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
                this.setHighlight(plane, false);
            }),
        );
        plane.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
                if (this.modalOpen) return;
                this.setHighlight(plane, false);
                this.showModal(index, data.title, data.img, data.text);
            }),
        );

        this.galleryMeshes.push(plane);
    }

    private setHighlight(plane: AbstractMesh, on: boolean): void {
        const border = plane.metadata?.border as AbstractMesh | undefined;
        if (border) border.isVisible = on;
    }

    private clearHighlights(): void {
        for (const mesh of this.galleryMeshes) {
            this.setHighlight(mesh, false);
        }
    }

    private fade(control: Control, from: number, to: number, duration: number, onEnd?: () => void): void {
        const start = performance.now();

        const tick = (now: number): void => {
            let t = (now - start) / duration;
            if (t > 1) t = 1;

            control.alpha = from + (to - from) * t;

            if (t < 1) {
                requestAnimationFrame(tick);
            } else {
                onEnd?.();
            }
        };

        requestAnimationFrame(tick);
    }

    private closeModal(): void {
        if (!this.modalOpen || !this.canvas) return;

        const controls = this.modalControls;
        this.modalOpen = false;
        this.modalControls = [];

        let remaining = controls.length;
        const onFaded = (): void => {
            remaining -= 1;
            if (remaining === 0) {
                controls.forEach((c) => c.dispose());
                this.galleryMeshes.forEach((m) => (m.isPickable = true));
                this.camera?.attachControl(this.canvas!, true);
            }
        };

        for (const control of controls) {
            this.fade(control, control.alpha, 0, 180, onFaded);
        }
    }

    private showModal(index: number, title: string, imageUrl: string, text: string): void {
        if (this.modalOpen || !this.ui || !this.canvas) return;

        this.modalOpen = true;
        this.clearHighlights();
        this.galleryMeshes.forEach((m) => (m.isPickable = false));
        this.camera?.detachControl();

        const backdrop = new Rectangle("backdrop");
        backdrop.width = 1;
        backdrop.height = 1;
        backdrop.thickness = 0;
        backdrop.background = "black";
        backdrop.alpha = 0;
        backdrop.isPointerBlocker = true;
        this.ui.addControl(backdrop);

        const config = WINDOW_CONFIGS[index % WINDOW_CONFIGS.length];
        const panel = new Rectangle("panel");
        panel.width = "560px";
        panel.height = "380px";
        panel.cornerRadius = 8;
        panel.thickness = 2;
        panel.color = "white";
        panel.background = config.color;
        panel.left = config.left;
        panel.top = config.top;
        panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        panel.alpha = 0;
        panel.isPointerBlocker = true;
        this.ui.addControl(panel);

        this.modalControls = [backdrop, panel];

        const stack = new StackPanel();
        panel.addControl(stack);

        const titleBlock = new TextBlock();
        titleBlock.text = title;
        titleBlock.height = "50px";
        titleBlock.color = "white";
        titleBlock.fontSize = 28;
        stack.addControl(titleBlock);

        const img = new Image("img", imageUrl);
        img.height = "180px";
        img.width = "350px";
        stack.addControl(img);

        const body = new TextBlock();
        body.text = text;
        body.height = "90px";
        body.color = "white";
        body.textWrapping = true;
        stack.addControl(body);

        const closeBtn = Button.CreateSimpleButton("close", "Close");
        closeBtn.width = "150px";
        closeBtn.height = "44px";
        closeBtn.background = "#333";
        closeBtn.color = "white";
        closeBtn.hoverCursor = "pointer";
        closeBtn.isPointerBlocker = true;
        closeBtn.onPointerClickObservable.add(() => this.closeModal());
        stack.addControl(closeBtn);

        this.fade(backdrop, 0, 0.55, 120);
        this.fade(panel, 0, 1, 120);

        this.bindBackdropDismiss(backdrop);
    }

    private bindBackdropDismiss(backdrop: Rectangle): void {
        const openedAt = performance.now();

        requestAnimationFrame(() => {
            backdrop.onPointerClickObservable.add(() => {
                if (performance.now() - openedAt < 300) return;
                this.closeModal();
            });
        });
    }

    private updateFps(): void {
        const fpsElement = document.getElementById("fps");
        if (fpsElement && this.engine) {
            fpsElement.textContent = `FPS: ${Math.round(this.engine.getFps())}`;
        }
    }
}
