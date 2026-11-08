import { Color3, Vector3 } from "@babylonjs/core";
import { animationManager } from "../managers/animation";
import { audioManager } from "../managers/audio";
import { fogManager } from "../managers/fog";
import { backgroundManager } from "../managers/background";
import { cameraManager } from "../managers/camera";
import { lightManager } from "../managers/light";
import { objectManager } from "../managers/object";
import type { Scene } from "../types";

export class SceneKZ implements Scene {
    async load(): Promise<void> {
        cameraManager.walkPosition(new Vector3(0, 0.7, 7.2));
        cameraManager.walkAcceleration(3.2);

        await objectManager.create({
            source: "assets/kz/city.glb",
        });

        backgroundManager.setBackground(new Color3(0.99, 0.99, 1), 0.06);
        fogManager.set({ color: [1, 0.99, 0.99], density: 0.006 });

        const ground = await objectManager.create({
            source: "assets/kz/ground.glb",
        });
        cameraManager.walkGround(ground);

        audioManager.add("assets/kz/ZVUK1.mp3", {
            position: new Vector3(1, 0, 28),
            radius: 15,
        });
        audioManager.add("assets/kz/ZVUK2.mp3", {
            position: new Vector3(4, 0, 64),
            radius: 10,
        });
        audioManager.add("assets/kz/ZVUK3.mp3", {
            position: new Vector3(0, 0, 116),
            radius: 15,
        });
        audioManager.add("assets/kz/ZVUK4.mp3", {
            position: new Vector3(1, 0, 272),
            radius: 40,
        });

        const end = await objectManager.create({
            source: "assets/kz/teleport.glb",
            scale: 1.1,
            x: 0.4,
            z: -36,
            ry: Math.PI,
            highlight: "highlightLayer",
            targetScene: "start",
        });
        animationManager.add(end, { preset: "float", speed: 0.64, amplitude: 0.18 });

        const spotLights = [
            { x: 0, y: 12, z: 308, intensity: 320, color: new Color3(1, 0.8, 0.6) },
            { x: 0, y: 16, z: 324, intensity: 640, color: new Color3(0.8, 1, 0.9) },
            // { x: -5, y: 14, z: 302, intensity: 600, color: new Color3(0.7, 0.7, 1) },
        ];
        spotLights.map((light) =>
            lightManager.createLight({
                meshes: [end],
                ...light,
                // fixture: { scale: 4 },
            }),
        );
    }
}
