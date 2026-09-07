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
  coverExitDuration: 0.45,
  repeatDelay: 1.5,
  enterEase: "power2.out",
  flipEase: "sine.inOut",
  dismissEase: "power2.in",
};
const cardFlipTiltAngles = [-10, -20, -5, 10];
const cardDismissTiltAngles = [-50, -60, -45, 50];
const degToRad = THREE.MathUtils.degToRad;

export function createAnimation({ camera, cardsGroup, frontCard, backCards, heroHeadline }) {
  function resetSequence() {
    cardsGroup.position.y = -6;
    frontCard.visible = true;
    frontCard.position.z = 0.12;
    frontCard.rotation.set(0, 0, 0);
    backCards.forEach((card, index) => {
      card.visible = true;
      card.position.set(backCardPositions[index].x, 0, backCardPositions[index].z);
      card.rotation.set(0, -Math.PI, 0);
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

  // 最后一张离场后带走剩余封面，使循环复位发生在画面外。
  const coverExitStart = MOTION.dismissStart
    + Math.max(0, backCards.length - 1) * MOTION.dismissStagger
    + MOTION.dismissDuration;
  timeline.fromTo(cardsGroup.position, { y: 0 }, {
    y: 6, duration: MOTION.coverExitDuration, ease: MOTION.dismissEase,
  }, coverExitStart);

  // 同一时间轴统一暂停翻牌与位移，也处理初始化时标签页已隐藏的情况。
  const handleVisibilityChange = () => timeline.paused(document.hidden);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  handleVisibilityChange();

  return function destroyAnimation() {
    timeline.kill();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}
