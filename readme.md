<div align="center">

# Authentic Not

Interactive online curatorial and research art exhibition.

<br>
<picture>
    <img src="public/an1.png" alt="" width="100">
</picture>

</div>

## Terms of Use & Copyright

All artworks presented within Authentic-not remain the intellectual property of their respective artists. Unless explicitly stated otherwise, all rights to individual artworks, including digital artworks, videos, images, sound works, 3D objects and other artistic content, are reserved by their respective copyright holders. The public accessibility of an artwork through Authentic-not does not constitute permission or a licence to reproduce, download for further use, publish, distribute, modify, commercially exploit or otherwise use the artwork.

## Exhibition engine

Each file in `src/scenes/` owns that scene's objects, lights, modal content, sounds, fog, animations, and interaction callbacks. Scenes import manager singletons directly and can combine them freely. `sceneManager` only registers, loads, unloads, and switches scenes. On a switch it clears all scene-scoped resources before loading the next scene.

Available managers:

- `cameraManager`
- `highlightManager`
- `lightManager`
- `modalManager`
- `animationManager`
- `audioManager`
- `subtitleManager`
- `fogManager`
- `sceneManager`

Run locally with `pnpm dev`, or create a production build with `pnpm build`.
