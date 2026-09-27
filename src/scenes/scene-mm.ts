import { Vector3, Color3 } from "@babylonjs/core";
// import { audioManager } from "../managers/audio";
import { cameraManager } from "../managers/camera";
import { lightManager } from "../managers/light";
import { objectManager } from "../managers/object";
import type { Scene } from "../types";

const CENTER = new Vector3(0, 0, 0);
const PANEL_SIZE = 4;

function panelFacingCenter(x: number, y: number, z: number) {
    return { x, y, z, ry: Math.atan2(-x, -z) };
}

const videoPanels = [
    {
        ...panelFacingCenter(34.99, 0, -45.01),
        source: "assets/mm/ah.mp4",
        external: "https://drive.google.com/file/d/19lSGROnHKfuz2xBGwVlkyycgkaFdZLCq/preview",
    },
    {
        ...panelFacingCenter(-54.62, 0, -12.28),
        source: "assets/mm/kv.mp4",
        external: "https://drive.google.com/file/d/1tUILQQj-4rahQ0-3bnpb9etwqlatzLw0/preview",
    },
    {
        ...panelFacingCenter(20.06, -0.38, 54.86),
        source: "assets/mm/mm.mp4",
        external: "https://drive.google.com/file/d/1km3_IeCJ4GAd0dXnor64Clbkplwg00yX/preview",
    },
];

export class SceneMM implements Scene {
    async load(): Promise<void> {
        cameraManager.setOrbit({
            target: CENTER,
            distance: 1,
            maxDistance: 300,
        });

        // audioManager.play("assets/mm/zvuk.mp3", { loop: true });

        const room = await objectManager.create({
            source: "assets/mm/room.glb",
            scale: 2,
            x: 0,
            y: 0,
            z: 0,
        });

        await Promise.all(
            videoPanels.map((object) =>
                objectManager.create({
                    ...object,
                    width: PANEL_SIZE,
                    height: PANEL_SIZE,
                    highlight: "glow",
                    modalClassName: "modal-scene-mm",
                    modal: [{ type: "embed", source: object.external }],
                }),
            ),
        );

        lightManager.disableGlobalLight();

        const spotLights = [
            { x: 35.6, y: 0, z: -45.8 },
            { x: -55.6, y: 0, z: -12.5 },
            { x: 20.4, y: 0, z: 55.8 },
            { x: 0, y: 1, z: 0, intensity: 16, color: new Color3(0.02, 0.019, 0.019) },
        ];
        spotLights.forEach((light) => {
            lightManager.createLight({
                meshes: [room],
                color: new Color3(1, 0.99, 0.98),
                ...light,
            });
        });
    }
}
