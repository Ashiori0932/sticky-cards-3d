import * as THREE from "three";
import { gsap } from "gsap";
import { backCardPositions } from "./scene.js";

// 所有时间均以秒为单位；各动作共用一条时间轴，避免争用旋转属性。
const MOTION = {
  enterStart: 0.75,
  enterDuration: 1,
  flipStart: 2.5,
  flipDuration: 0.75,
  dismissStart: 3.9,
  dismissDuration: 0.85,
  dismissStagger: 0.6,
  cameraRushDuration: 0.48,
  cameraSettleDuration: 0.18,
  targetHoldDuration: 3,
  cameraRushZ: 4.85,
  cameraSettleZ: 5.1,
  impactDuration: 0.46,
  impactFadeDuration: 0.2,
  repeatDelay: 1.5,
  enterEase: "power2.out",
  flipEase: "sine.inOut",
  dismissEase: "power2.in",
};
const cardFlipTiltAngles = [-10, -20, -5, 10];
const cardDismissTiltAngles = [-50, -60, -45, 50];
const degToRad = THREE.MathUtils.degToRad;

export function createAnimation({ camera, cardsGroup, frontCard, backCards, impactLines, heroHeadline }) {
  function resetSequence() {
    cardsGroup.position.y = -6;
    frontCard.visible = true;
    frontCard.position.z = 0.12;
    frontCard.rotation.set(0, 0, 0);
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);
    backCards.forEach((card, index) => {
      card.visible = true;
      card.position.set(backCardPositions[index].x, 0, backCardPositions[index].z);
      card.rotation.set(0, -Math.PI, 0);
    });
    impactLines.visible = false;
    impactLines.children.forEach((line) => {
      line.position.set(line.userData.startX, line.userData.startY, 0);
      line.scale.set(line.userData.length * 0.04, line.userData.width * 0.62, 1);
      line.userData.materials.forEach((material) => { material.opacity = 0; });
    });
    gsap.set(heroHeadline, { yPercent: 0 });
  }

  camera.position.set(0, 0, 8);
  camera.lookAt(0, 0, 0);
  resetSequence();

  const timeline = gsap.timeline({
    paused: true,
    repeat: -1,
    repeatDelay: MOTION.repeatDelay,
    onRepeat: resetSequence,
    defaults: { immediateRender: false },
  });

  timeline.fromTo(cardsGroup.position, { y: -6 }, {
    y: 0, duration: MOTION.enterDuration, ease: MOTION.enterEase,
  }, MOTION.enterStart);
  timeline.fromTo(heroHeadline, { yPercent: 0 }, {
    yPercent: -500, duration: MOTION.enterDuration, ease: MOTION.enterEase,
  }, MOTION.enterStart);

  timeline.fromTo(frontCard.rotation, { y: 0 }, {
    y: Math.PI, duration: MOTION.flipDuration, ease: MOTION.flipEase,
  }, MOTION.flipStart);

  // 封面接近侧对镜头时平滑移到牌堆后方，减轻遮挡关系切换的突兀感。
  const depthDuration = 0.16;
  timeline.fromTo(frontCard.position, { z: 0.12 }, {
    z: -0.48, duration: depthDuration, ease: "sine.inOut",
  }, MOTION.flipStart + (MOTION.flipDuration - depthDuration) / 2);

  backCards.forEach((card, index) => {
    const flipTilt = degToRad(cardFlipTiltAngles[index]);
    timeline.fromTo(card.rotation, { y: -Math.PI, z: 0 }, {
      y: 0, z: flipTilt,
      duration: MOTION.flipDuration, ease: MOTION.flipEase,
    }, MOTION.flipStart);

    // 翻牌全部完成并短暂停留后，再让不同卡片交叠退场。
    const dismissStart = MOTION.dismissStart + index * MOTION.dismissStagger;
    const x = backCardPositions[index].x;
    const xOffset = index % 2 === 0 ? -0.24 : 0.24;
    timeline.fromTo(card.position, { x, y: 0 }, {
      x: x + xOffset, y: 6,
      duration: MOTION.dismissDuration, ease: MOTION.dismissEase,
    }, dismissStart);
    timeline.fromTo(card.rotation, { z: flipTilt }, {
      z: degToRad(cardDismissTiltAngles[index]),
      duration: MOTION.dismissDuration, ease: MOTION.dismissEase,
    }, dismissStart);
  });

  // 其他卡牌离场后，封面留在原处成为最终目标；镜头拉近并额外展示 3 秒。
  const finalCardRevealStart = MOTION.dismissStart
    + Math.max(0, backCards.length - 1) * MOTION.dismissStagger
    + MOTION.dismissDuration;
  timeline.set(impactLines, { visible: true }, finalCardRevealStart);
  impactLines.children.forEach((line) => {
    const start = finalCardRevealStart + line.userData.delay;
    const cos = Math.cos(line.userData.angle);
    const sin = Math.sin(line.userData.angle);
    timeline.to(line.userData.materials, {
      opacity: 0.92,
      duration: 0.1,
      ease: "power1.out",
    }, start);
    timeline.to(line.scale, {
      x: line.userData.length,
      y: line.userData.width,
      duration: MOTION.impactDuration,
      ease: "power4.in",
    }, start);
    timeline.to(line.position, {
      x: line.userData.startX + cos * 0.2,
      y: line.userData.startY + sin * 0.2,
      duration: MOTION.impactFadeDuration,
      ease: "power2.in",
    }, start + 0.34);
    timeline.to(line.userData.materials, {
      opacity: 0,
      duration: MOTION.impactFadeDuration,
      ease: "power3.in",
    }, start + 0.34);
  });
  timeline.to(camera.position, {
    z: MOTION.cameraRushZ,
    duration: MOTION.cameraRushDuration,
    ease: "expo.in",
  }, finalCardRevealStart);
  timeline.to(camera.position, {
    z: MOTION.cameraSettleZ,
    duration: MOTION.cameraSettleDuration,
    ease: "power2.out",
  }, finalCardRevealStart + MOTION.cameraRushDuration);
  timeline.set(impactLines, { visible: false }, finalCardRevealStart + 0.68);
  timeline.to({}, { duration: MOTION.targetHoldDuration });

  // 同一时间轴统一暂停翻牌与位移，也处理初始化时标签页已隐藏的情况。
  const handleVisibilityChange = () => timeline.paused(document.hidden);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  handleVisibilityChange();

  return function destroyAnimation() {
    timeline.kill();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}
