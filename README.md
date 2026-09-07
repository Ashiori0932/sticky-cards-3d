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
- The sequence starts automatically and loops after a three-second final-card reveal.
- A single GSAP timeline controls the eased entrance, gentle Y-axis flip, and exits.
- Four cards accelerate upward in order, with overlapping exits on different cards.
- The cover moves behind the stack near the edge-on part of the flip, remains in
  place after the other cards exit, and becomes the target of a camera push-in.
- GSAP writes directly to Three.js object properties; no CSS transforms are used for cards.
- Playback pauses while the tab is hidden and resumes when it becomes visible.
- Resize, HMR, WebGL fallback, and GPU resource cleanup are included.

## Motion tuning

Edit the `MOTION` constants in `src/animation.js`; all timings are in seconds.
`enterEase`, `flipEase`, and `dismissEase` control each phase independently.
Keep `dismissStart` after `flipStart + flipDuration` to avoid competing rotation
tweens. `dismissStagger` controls the interval between cards; values below
`dismissDuration` create overlapping exits. `cameraZoomDuration` controls the
final push-in, and `targetHoldDuration` adds display time without shortening any
earlier phase.

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
as `/cards/my-front.webp`. Every card has the same fixed height; its width is
calculated from the front image's intrinsic aspect ratio after the image loads.
