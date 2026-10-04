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
        ...panelFacingCenter(0, 0, 13.2),
        source: "assets/mm/ah.mp4",
        external: "https://youtu.be/Sz1z0V6EFYk",
    },
    {
        ...panelFacingCenter(10.4, 0, -6.33),
        source: "assets/mm/kv.mp4",
        external: "https://youtu.be/wV4CxtcqknM",
    },
    {
        ...panelFacingCenter(-10.4, 0, -6.36),
        source: "assets/mm/mm.mp4",
        external: "https://youtu.be/5XOk-TidCOM",
    },
];

export class SceneMM implements Scene {
    async load(): Promise<void> {
        cameraManager.setOrbit({
            target: CENTER,
            distance: 2,
            maxDistance: 2.8,
            invertKeys: true,
        });

        // audioManager.play("assets/mm/zvuk.mp3", { loop: true });

        const room = await objectManager.create({
            source: "assets/mm/room.glb",
            scale: 2,
            envIntensity: 0,
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
            { x: 0, y: 0, z: 13.4, color: new Color3(1, 0.8, 0.72) },
            { x: 10.4, y: 0, z: -6.26, color: new Color3(0.9, 1, 0.8) },
            { x: -10.4, y: 0, z: -6.26, color: new Color3(0.8, 0.9, 1) },
            // { x: 0, y: 1, z: 0, intensity: 2, color: new Color3(0.024, 0.023, 0.022) },
        ];
        spotLights.forEach((light) => {
            lightManager.createLight({
                meshes: [room],
                intensity: 8,
                // fixture: { scale: 1 },
                ...light,
            });
        });
    }
}
