import * as THREE from "three";
import { gsap } from "gsap";
import { CARD_HEIGHT, createCard, disposeCard } from "./card.js";
import cardBackImage from "./assets/card-back.svg";
import breatheImage from "./assets/card-breathe.svg";
import coverImage from "./assets/card-cover.svg";
import moveImage from "./assets/card-move.svg";
import noticeImage from "./assets/card-notice.svg";
import restImage from "./assets/card-rest.svg";

export const backCardPositions = [
  { x: -0.05, z: -0.08 },
  { x: 0.03, z: -0.18 },
  { x: -0.02, z: -0.28 },
  { x: 0.04, z: -0.38 },
];

export function createScene(container) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (error) {
    console.error("WebGL initialization failed:", error);
    const fallback = document.createElement("div");
    fallback.className = "webgl-fallback";
    fallback.textContent = "This experience requires WebGL support.";
    container.appendChild(fallback);
    return null;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 8);
  camera.lookAt(0, 0, 0);

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  const keyLight = new THREE.DirectionalLight(0xffffff, 2);
  keyLight.position.set(3, 5, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  const fillLight = new THREE.DirectionalLight(0xdde7ff, 0.65);
  fillLight.position.set(-4, -1, 4);
  scene.add(ambientLight, keyLight, fillLight);

  const cardsGroup = new THREE.Group();
  cardsGroup.position.y = -6;
  scene.add(cardsGroup);
  let handleResize = () => {};
  const cardOptions = { onResize: () => handleResize() };
  const frontCard = createCard({
    frontImage: coverImage,
    backImage: cardBackImage,
    sideColor: "#8e4aaf",
    z: 0.12,
    ...cardOptions,
  });
  const frontImages = [breatheImage, moveImage, noticeImage, restImage];
  const colors = ["#f0fd00", "#dfebe0", "#8c26fd", "#9bfd40"];
  const backCards = frontImages.map((frontImage, index) => {
    const card = createCard({
      frontImage,
      backImage: cardBackImage,
      sideColor: colors[index],
      z: backCardPositions[index].z,
      ...cardOptions,
    });
    card.position.x = backCardPositions[index].x;
    card.rotation.y = -Math.PI;
    return card;
  });
  const resourceCards = [frontCard, ...backCards];
  cardsGroup.add(...resourceCards);

  handleResize = function resizeScene() {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const distance = Math.abs(camera.position.z - cardsGroup.position.z);
    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
    const visibleWidth = visibleHeight * camera.aspect;
    const widestCard = Math.max(...resourceCards.map((card) => card.userData.cardWidth));
    const scale = gsap.utils.clamp(0.52, 1, Math.min((visibleWidth * 0.82) / widestCard, (visibleHeight * 0.78) / CARD_HEIGHT, 1));
    cardsGroup.scale.setScalar(scale);
  };
  handleResize();
  window.addEventListener("resize", handleResize, { passive: true });

  let frameId = 0;
  let destroyed = false;
  function render() {
    if (destroyed) return;
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(render);
  }
  render();

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(frameId);
    window.removeEventListener("resize", handleResize);
    resourceCards.forEach(disposeCard);
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { scene, camera, cardsGroup, frontCard, backCards, destroy };
}
