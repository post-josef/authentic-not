import { Vector3, Color3 } from "@babylonjs/core";
// import { animationManager } from "../managers/animation";
import { cameraManager } from "../managers/camera";
import { lightManager } from "../managers/light";
import { objectManager } from "../managers/object";
import type { Scene } from "../types";

const CENTER = new Vector3(0, 0, 0);

// const VIDEOS: Record<string, string> = {
//     // "valec-vrsek": "assets/jv/video.mp4",
// };

export class SceneJV implements Scene {
    async load(): Promise<void> {
        cameraManager.setOrbit({
            target: CENTER,
            distance: 8,
            maxDistance: 40,
        });

        const grassball = await objectManager.create({
            source: "assets/jv/1.glb",
            y: -1,
        });
        // animationManager.add(grassball, { preset: "float", speed: 0.6, amplitude: 0.2 });

        const spotLights = [
            { x: 0, y: 6, z: 0, intensity: 120 },
            { x: -10, y: -4, z: 0, intensity: 160 },
            { x: 4, y: 24, z: 16, intensity: 200 },
        ];
        spotLights.forEach((light) => {
            lightManager.createLight({
                ...light,
                target: CENTER,
                meshes: [grassball],
                color: new Color3(0.92, 0.96, 1), // white light
                // fixture: { scale: 1 },
            });
        });
    }
}
