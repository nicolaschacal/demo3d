# Wildbound — 3D adventure landing

A small Three.js landing-page experiment. The hero scene shows a low-poly adventurer and a fox companion in a stylized forest, with a camera parallax effect and animated GLB characters.

## Run locally

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Reused references and assets

- **Scene direction:** inspired by the existing [ThreeJSIsometricTest](https://github.com/Bobs-Dev-Attic/ThreeJSIsometricTest) isometric forest/RPG demo. This project is a compact landing-page adaptation, not a copy of its full game.
- **3D models:** [Gobkit free GLB library](https://gobkit.com/freebies) — Scout character, Fox companion, and low-poly environment props.
- **Model license:** Gobkit identifies these downloadable models as CC0 1.0 (public domain), including commercial use without attribution. See the [live asset manifest](https://gobkit.com/api/free).
- **Three.js:** MIT license.

Models are loaded from Gobkit's public URLs at runtime, so the page needs an internet connection and relies on that host remaining available.

## Notes

The scene is intentionally kept simple for a tutorial: one canvas, a small set of GLB models, animation mixers, a lightweight forest layout, and a little pointer-based camera movement.
