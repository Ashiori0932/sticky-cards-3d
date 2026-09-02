# Sticky Cards — Three.js 3D Autoplay Flip

A Vite + Three.js + GSAP implementation of an automatically playing card sequence.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Key implementation details

- One Three.js scene, one perspective camera, one renderer, one render loop.
- Five physical `THREE.Mesh` cards using `BoxGeometry` with real thickness.
- Front and back card artwork are procedural 1024×1280 canvas textures.
- The sequence starts automatically, lasts 14 seconds, pauses briefly, and loops.
- The group rises while the headline exits, followed by an elastic Three.js Y-axis flip.
- Four cards dismiss upward in order with exact, non-overlapping progress windows.
- GSAP writes directly to Three.js object properties; no CSS transforms are used for cards.
- Playback pauses while the tab is hidden and resumes when it becomes visible.
- Resize, HMR, WebGL fallback, and GPU resource cleanup are included.
