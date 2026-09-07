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
- Front and back artwork is loaded from image files or remote image URLs with
  `THREE.TextureLoader`; no card artwork is drawn at runtime.
- The sequence starts automatically, lasts 14 seconds, pauses briefly, and loops.
- The group rises while the headline exits, followed by an elastic Three.js Y-axis flip.
- Four cards dismiss upward in order with exact, non-overlapping progress windows.
- GSAP writes directly to Three.js object properties; no CSS transforms are used for cards.
- Playback pauses while the tab is hidden and resumes when it becomes visible.
- Resize, HMR, WebGL fallback, and GPU resource cleanup are included.

## Use your own card images

`createCard` accepts a `frontImage` and a `backImage`. Import a local file through
Vite, or pass any image URL allowed by the image host's CORS policy:

```js
import frontImage from "./assets/my-front.png";

const card = createCard({
  frontImage,
  backImage: "https://example.com/images/my-back.jpg",
  sideColor: "#8e4aaf",
});
```

For images copied to Vite's `public` directory, use an absolute public path such
as `/cards/my-front.webp`. Artwork should use the card's 4:5 aspect ratio to avoid
distortion.
