import "./style.css";
import { createAnimation } from "./animation.js";
import { createScene } from "./scene.js";

function init() {
  const root = document.querySelector("#app");
  const hero = root?.querySelector(".hero");
  const heroHeadline = root?.querySelector(".hero-content h1");
  const container = root?.querySelector(".three-container");
  if (!root || !hero || !heroHeadline || !container) return;

  const sceneContext = createScene(container);
  if (!sceneContext) return;
  const destroyAnimation = createAnimation({ ...sceneContext, heroHeadline });
  let destroyed = false;
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    destroyAnimation();
    sceneContext.destroy();
    window.removeEventListener("beforeunload", destroy);
  }
  window.addEventListener("beforeunload", destroy, { once: true });
  if (import.meta.hot) import.meta.hot.dispose(destroy);
  return destroy;
}

if (document.fonts?.ready) {
  document.fonts.ready.then(init);
} else {
  init();
}
