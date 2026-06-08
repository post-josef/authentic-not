import { Scene, MeshBuilder, StandardMaterial, Color3, Texture, ActionManager, ExecuteCodeAction, AbstractMesh } from "@babylonjs/core";
import { Image, Control } from "@babylonjs/gui";
import type { GalleryItem } from "./scenes/types";

export const PLANE_WIDTH = 2.3;
export const PLANE_HEIGHT = 3.2;
export const BORDER_WIDTH = 0.04;

export function createFixedHeightImage(imageUrl: string, heightPx: number): Image {
    const img = new Image("img", imageUrl);
    img.height = `${heightPx}px`;
    img.onImageLoadedObservable.addOnce(() => {
        if (img.imageHeight > 0) {
            img.width = `${(heightPx * img.imageWidth) / img.imageHeight}px`;
        }
    });
    return img;
}

export function fadeControl(control: Control, from: number, to: number, duration: number, onEnd?: () => void): void {
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

export function setPlaneHighlight(plane: AbstractMesh, on: boolean): void {
    const border = plane.metadata?.border as AbstractMesh | undefined;
    if (border) border.isVisible = on;
}

export function createInteractiveImagePlane(
    scene: Scene,
    data: GalleryItem,
    options: {
        isInteractionBlocked: () => boolean;
        onPick: () => void;
    },
): AbstractMesh {
    const plane = MeshBuilder.CreatePlane(data.title, { width: PLANE_WIDTH, height: PLANE_HEIGHT }, scene);
    plane.position.set(data.x, data.y ?? 1.8, data.z ?? 5);
    plane.rotation.y = data.r;

    const mat = new StandardMaterial(`${data.title}Mat`, scene);
    mat.diffuseTexture = new Texture(data.img, scene);
    mat.opacityTexture = mat.diffuseTexture;
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.backFaceCulling = false;
    plane.material = mat;

    const border = MeshBuilder.CreatePlane(
        `${data.title}Border`,
        { width: PLANE_WIDTH + BORDER_WIDTH * 2, height: PLANE_HEIGHT + BORDER_WIDTH * 2 },
        scene,
    );
    border.parent = plane;
    border.position.z = -0.005;

    const borderMat = new StandardMaterial(`${data.title}BorderMat`, scene);
    borderMat.emissiveColor = Color3.White();
    borderMat.disableLighting = true;
    borderMat.backFaceCulling = false;
    border.material = borderMat;
    border.isVisible = false;
    border.isPickable = false;
    border.renderingGroupId = 0;
    plane.renderingGroupId = 1;
    plane.metadata = { border };

    plane.actionManager = new ActionManager(scene);
    plane.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
            if (options.isInteractionBlocked()) return;
            setPlaneHighlight(plane, true);
        }),
    );
    plane.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
            setPlaneHighlight(plane, false);
        }),
    );
    plane.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
            if (options.isInteractionBlocked()) return;
            setPlaneHighlight(plane, false);
            options.onPick();
        }),
    );

    return plane;
}
