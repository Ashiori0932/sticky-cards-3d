import * as THREE from "three";
import { gsap } from "gsap";
import { backCardPositions } from "./scene.js";

const CARDS_ENTER_START = 100;
const CARDS_ENTER_END = 200;
const CARD_FLIP_TRIGGER = 300;
const CARD_DISMISS_START = 400;
const CARD_DISMISS_DURATION = 100;
const STICKY_CARD_COUNT = 4;
const TOTAL_SEQUENCE_UNITS = CARD_DISMISS_START + STICKY_CARD_COUNT * CARD_DISMISS_DURATION;
const AUTOPLAY_DURATION = 7;
const AUTOPLAY_REPEAT_DELAY = 1.5;
const cardFlipTiltAngles = [-10, -20, -5, 10];
const cardDismissTiltAngles = [-50, -60, -45, 50];
const degToRad = THREE.MathUtils.degToRad;
const clamp = gsap.utils.clamp;
const mapRange = gsap.utils.mapRange;
const unitToProgress = (unit) => unit / TOTAL_SEQUENCE_UNITS;

export function createAnimation({ camera, cardsGroup, frontCard, backCards, heroHeadline }) {
  let isFlipped = false;
  let isFlipAnimating = false;
  let flipTimeline = null;
  const flipThreshold = unitToProgress(CARD_FLIP_TRIGGER);
  const dismissThreshold = unitToProgress(CARD_DISMISS_START);
  const playback = { progress: 0 };

  function killFlipTimeline() {
    flipTimeline?.kill();
    flipTimeline = null;
  }

  function revealBackCards() {
    killFlipTimeline();
    isFlipAnimating = true;
    flipTimeline = gsap.timeline({
      defaults: { duration: 1, ease: "elastic.out(1, 0.5)" },
      onComplete: () => { isFlipAnimating = false; },
    });
    flipTimeline.to(frontCard.rotation, { y: Math.PI }, 0);
    flipTimeline.call(() => { frontCard.position.z = -0.48; }, [], 0);
    backCards.forEach((card, index) => {
      flipTimeline.to(card.rotation, { y: 0, z: degToRad(cardFlipTiltAngles[index]) }, 0);
    });
  }

  function updateSequence(progress) {
    const enterProgress = clamp(0, 1, mapRange(
      unitToProgress(CARDS_ENTER_START), unitToProgress(CARDS_ENTER_END), 0, 1, progress,
    ));
    cardsGroup.position.y = mapRange(0, 1, -6, 0, enterProgress);
    gsap.set(heroHeadline, { yPercent: mapRange(0, 1, 0, -500, enterProgress) });

    // 镜头目前保持静止；相机更新集中在动画模块，便于后续加入运镜。
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);

    if (progress > flipThreshold && !isFlipped) {
      revealBackCards();
      isFlipped = true;
    }

    backCards.forEach((card, index) => {
      const dismissStart = unitToProgress(CARD_DISMISS_START + index * CARD_DISMISS_DURATION);
      const dismissEnd = unitToProgress(CARD_DISMISS_START + (index + 1) * CARD_DISMISS_DURATION);
      if (progress <= flipThreshold) {
        card.position.y = 0;
        card.position.x = backCardPositions[index].x;
        return;
      }
      const dismissProgress = clamp(0, 1, mapRange(dismissStart, dismissEnd, 0, 1, progress));
      card.position.y = THREE.MathUtils.lerp(0, 6, dismissProgress);
      const xOffset = index % 2 === 0 ? -0.24 : 0.24;
      card.position.x = THREE.MathUtils.lerp(backCardPositions[index].x, backCardPositions[index].x + xOffset, dismissProgress);
      if (dismissProgress > 0 || (!isFlipAnimating && progress >= dismissThreshold)) {
        card.rotation.z = THREE.MathUtils.lerp(
          degToRad(cardFlipTiltAngles[index]), degToRad(cardDismissTiltAngles[index]), dismissProgress,
        );
      } else if (!isFlipAnimating) {
        card.rotation.z = degToRad(cardFlipTiltAngles[index]);
      }
    });
  }

  function resetSequence() {
    killFlipTimeline();
    isFlipped = false;
    isFlipAnimating = false;
    frontCard.visible = true;
    frontCard.position.z = 0.12;
    frontCard.rotation.set(0, 0, 0);
    backCards.forEach((card, index) => {
      card.visible = true;
      card.position.set(backCardPositions[index].x, 0, backCardPositions[index].z);
      card.rotation.set(0, -Math.PI, 0);
    });
    playback.progress = 0;
    updateSequence(0);
  }

  resetSequence();
  const autoplayTimeline = gsap.timeline({ repeat: -1, repeatDelay: AUTOPLAY_REPEAT_DELAY, onRepeat: resetSequence })
    .to(playback, {
      progress: 1, duration: AUTOPLAY_DURATION, ease: "none",
      onUpdate: () => updateSequence(playback.progress),
    });
  const handleVisibilityChange = () => document.hidden ? autoplayTimeline.pause() : autoplayTimeline.resume();
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return function destroyAnimation() {
    killFlipTimeline();
    autoplayTimeline.kill();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}
