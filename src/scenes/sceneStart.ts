import { animationManager } from "../managers/animation";
import { lightManager } from "../managers/light";
import { objectManager } from "../managers/object";
import { Color3, CubeTexture, PBRMaterial, Vector3 } from "@babylonjs/core";
import type { AbstractMesh } from "@babylonjs/core";
import type { Scene, Object3D } from "../types";

const MM_OBJECT_SOURCE = "assets/mm/object.glb";
const METAL_ENVIRONMENT_URL = "https://assets.babylonjs.com/environments/environmentSpecular.env";

function applyMetallicMaterial(root: AbstractMesh, reflection: CubeTexture): void {
    const scene = root.getScene();
    for (const part of [root, ...root.getChildMeshes()]) {
        if (!part.getTotalVertices()) continue;

        const material = new PBRMaterial(`${part.name}MetalMat`, scene);
        material.albedoColor = new Color3(0.92, 0.93, 0.95);
        material.metallic = 1;
        material.roughness = 0.22;
        material.reflectionTexture = reflection;
        part.material = material;
    }
}

const OBJECTS: Object3D[] = [
    {
        source: "assets/ns/face.glb",
        targetScene: "ns",
        x: -2,
        y: -4,
        z: 5,
        ry: Math.PI,
        subtitle: "Natálie Sedláčková",
        scale: 6,
        highlight: "highlightLayer",
    },
    {
        source: "assets/kv/zdimacka.jpg",
        targetScene: "kv",
        x: 2,
        y: 1.8,
        z: 5,
        subtitle: "Kryštof Vitner",
        width: 2.4,
        height: 3.4,
        highlight: "highlightLayer",
    },
    {
        source: MM_OBJECT_SOURCE,
        targetScene: "mm",
        x: 6,
        y: 1.8,
        z: 5,
        scale: 0.3,
        subtitle: "Miroslav Mužík",
        highlight: "highlightLayer",
    },
];

export class SceneStart implements Scene {
    async load(): Promise<void> {
        const portals = await Promise.all(
            OBJECTS.map(async (object, index) => {
                const mesh = await objectManager.create(object);
                animationManager.add(mesh, { preset: "float", speed: 1.4, phase: index });
                return mesh;
            }),
        );

        const mmMesh = portals[OBJECTS.findIndex((object) => object.source === MM_OBJECT_SOURCE)];
        const metalEnvironment = CubeTexture.CreateFromPrefilteredData(
            METAL_ENVIRONMENT_URL,
            mmMesh.getScene(),
        );
        applyMetallicMaterial(mmMesh, metalEnvironment);
        const releaseMm = mmMesh.metadata.exhibitDispose as () => void;
        mmMesh.metadata.exhibitDispose = () => {
            metalEnvironment.dispose();
            releaseMm();
        };

        lightManager.createLight({
            x: 0,
            y: 3.2,
            z: 1.5,
            target: new Vector3(0, 1.8, 5),
            color: new Color3(1, 0.32, 0.32),
            intensity: 1.2,
            range: 18,
            meshes: portals,
        });
    }
}
