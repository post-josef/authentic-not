import { Color3, Vector3 } from "@babylonjs/core";
import { animationManager } from "../managers/animation";
// import { audioManager } from "../managers/audio";
import { cameraManager } from "../managers/camera";
import { lightManager } from "../managers/light";
import { objectManager } from "../managers/object";
import type { Scene } from "../types";

export class SceneKZ implements Scene {
    async load(): Promise<void> {
        // audioManager.play("assets/kz/zvuk.mp3", { loop: true, volume: 2 });

        cameraManager.walkPosition(new Vector3(0, 0.7, 9));
        cameraManager.walkAcceleration(5);

        await objectManager.create({
            source: "assets/kz/city.glb",
        });

        const ground = await objectManager.create({
            source: "assets/kz/ground.glb",
        });

        cameraManager.walkGround(ground, true);
        // ground.getChildMeshes().forEach((part) => {
        //     const material = part.material as StandardMaterial;
        //     material.emissiveColor = new Color3(0.4, 0.2, 0.1);
        //     material.alpha = 0.6;
        // });

        const end = await objectManager.create({
            source: "assets/kz/teleport.glb",
            scale: 2,
            x: 2.8,
            z: -332,
            ry: Math.PI,
            highlight: "highlightLayer",
            targetScene: "start",
        });
        animationManager.add(end, { preset: "float", speed: 0.64, amplitude: 0.18 });

        const spotLights = [
            { x: 0, y: 16, z: 300, intensity: 600, color: new Color3(1, 0.8, 0.6) },
            { x: 0, y: 20, z: 310, intensity: 2000, color: new Color3(0.8, 1, 0.9) },
            // { x: -5, y: 14, z: 302, intensity: 600, color: new Color3(0.7, 0.7, 1) },
        ];
        // const lights =
        spotLights.map((light) =>
            lightManager.createLight({
                meshes: [end],
                ...light,
                // fixture: { scale: 4 },
            }),
        );

        // let lightsOn = true;
        // objectManager.interactive(end, {
        //     onClick: () => {
        //         lightsOn = !lightsOn;
        //         const scene = end.getScene();
        //         for (const light of lights) {
        //             // if (light !== lights[2]) continue;
        //             light.setEnabled(lightsOn);
        //             scene.getMeshByName(`${light.name}Fixture`)?.setEnabled(lightsOn);
        //         }
        //     },
        // });
    }
}
