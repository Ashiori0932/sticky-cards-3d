# Sticky Cards — Three.js 3D Scroll-Pinned Flip

A Vite + Three.js + GSAP ScrollTrigger + Lenis implementation of a pinned 700svh card sequence.

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
- 0–100svh: group rises while headline exits.
- 200svh: one-shot elastic Three.js Y-axis flip.
- 300–700svh: four cards dismiss upward in reverse order with exact, non-overlapping progress windows.
- ScrollTrigger writes directly to Three.js object properties; no CSS transforms are used for cards.
- Lenis follows the GSAP ticker integration requested in the specification.
- Resize, HMR, WebGL fallback, and GPU resource cleanup are included.
