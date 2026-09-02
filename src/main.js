import "./style.css";
import * as THREE from "three";
import { gsap } from "gsap";

// ============================================================================
// 1. 基础参数
// ============================================================================

// 卡牌几何参数
const CARD_WIDTH = 3;
const CARD_HEIGHT = 3.75;
const CARD_DEPTH = 0.06;

// 卡牌时间参数
const CARDS_ENTER_END = 100;
const CARD_FLIP_TRIGGER = 200;
const CARD_DISMISS_START = 300;
const CARD_DISMISS_DURATION = 100;
const STICKY_CARD_COUNT = 4;

const TOTAL_SEQUENCE_UNITS =
    CARD_DISMISS_START + STICKY_CARD_COUNT * CARD_DISMISS_DURATION;

const AUTOPLAY_DURATION = 7;
const AUTOPLAY_REPEAT_DELAY = 1.5;

// 四张后方卡片翻开后的倾角
const cardFlipTiltAngles = [-10, -20, -5, 10];

// 四张卡片抽离时的最终倾角
const cardDismissTiltAngles = [-50, -60, -45, 50];

const cardColors = [
  "#f0fd00",
  "#dfebe0",
  "#8c26fd",
  "#9bfd40",
];

const cardTextColors = [
  "#0f0f0f",
  "#0f0f0f",
  "#ffffff",
  "#0f0f0f",
];

// 相机位于 z=8，因此 Z 越大越靠近相机。
// Z 间距大于卡片厚度，避免翻转时穿模。
const backCardPositions = [
  { x: -0.05, z: -0.08 },
  { x: 0.03, z: -0.18 },
  { x: -0.02, z: -0.28 },
  { x: 0.04, z: -0.38 },
];

// ============================================================================
// 2. 工具函数
// ============================================================================

const degToRad = THREE.MathUtils.degToRad;
const clamp = gsap.utils.clamp;
const mapRange = gsap.utils.mapRange;

function unitToProgress(unit) {
  return unit / TOTAL_SEQUENCE_UNITS;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

// ============================================================================
// 3. Canvas 图标绘制
// ============================================================================

function drawIcon(ctx, type, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(8, size * 0.055);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (type === "chevron") {
    ctx.beginPath();
    ctx.moveTo(-size * 0.34, -size * 0.08);
    ctx.lineTo(0, size * 0.25);
    ctx.lineTo(size * 0.34, -size * 0.08);
    ctx.stroke();
  }

  if (type === "leaf") {
    ctx.beginPath();
    ctx.moveTo(-size * 0.32, size * 0.2);

    ctx.bezierCurveTo(
        -size * 0.1,
        -size * 0.45,
        size * 0.42,
        -size * 0.42,
        size * 0.32,
        size * 0.08
    );

    ctx.bezierCurveTo(
        size * 0.2,
        size * 0.45,
        -size * 0.12,
        size * 0.38,
        -size * 0.32,
        size * 0.2
    );

    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-size * 0.28, size * 0.22);
    ctx.lineTo(size * 0.22, -size * 0.22);
    ctx.stroke();
  }

  if (type === "footsteps") {
    const foot = (ox, oy, rot) => {
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(rot);

      ctx.beginPath();
      ctx.ellipse(
          0,
          0,
          size * 0.13,
          size * 0.24,
          0,
          0,
          Math.PI * 2
      );
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(
          size * 0.02,
          -size * 0.28,
          size * 0.05,
          0,
          Math.PI * 2
      );
      ctx.stroke();

      ctx.restore();
    };

    foot(-size * 0.16, size * 0.12, -0.25);
    foot(size * 0.16, -size * 0.12, 0.25);
  }

  if (type === "eye") {
    ctx.beginPath();
    ctx.moveTo(-size * 0.42, 0);
    ctx.quadraticCurveTo(0, -size * 0.34, size * 0.42, 0);
    ctx.quadraticCurveTo(0, size * 0.34, -size * 0.42, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, size * 0.105, 0, Math.PI * 2);
    ctx.fill();
  }

  if (type === "moon") {
    ctx.beginPath();

    ctx.arc(
        0,
        0,
        size * 0.32,
        Math.PI * 0.25,
        Math.PI * 1.75,
        false
    );

    ctx.bezierCurveTo(
        -size * 0.02,
        size * 0.14,
        size * 0.08,
        -size * 0.18,
        size * 0.23,
        -size * 0.24
    );

    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

// ============================================================================
// 4. 创建卡片纹理
// ============================================================================

function createCardTexture({
                             background,
                             foreground,
                             title,
                             subtitle,
                             index,
                             icon,
                             back = false,
                           }) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1280;

  const ctx = canvas.getContext("2d", { alpha: false });

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // --------------------------------------------------------------------------
  // 卡片背面
  // --------------------------------------------------------------------------

  if (back) {
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-Math.PI / 8);

    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = foreground;
    ctx.lineWidth = 2;

    for (let i = -1000; i <= 1000; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, -900);
      ctx.lineTo(i, 900);
      ctx.stroke();
    }

    ctx.restore();

    ctx.globalAlpha = 1;
    ctx.fillStyle = foreground;
    ctx.textAlign = "center";

    ctx.font = '900 90px "Barlow Condensed", sans-serif';
    ctx.fillText("STICKY / 3D", 512, 610);

    ctx.font = '500 26px "DM Sans", sans-serif';
    ctx.fillText(
        "TURN THE CARD · FOLLOW THE MOTION",
        512,
        674
    );

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;

    return texture;
  }

  // --------------------------------------------------------------------------
  // 卡片正面：背景点阵
  // --------------------------------------------------------------------------

  ctx.globalAlpha = 0.08;
  ctx.fillStyle = foreground;

  for (let y = 90; y < 1190; y += 48) {
    for (let x = 90; x < 950; x += 48) {
      if (((x + y) / 48) % 5 === 0) {
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = foreground;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // 主标题
  ctx.font = '900 166px "Barlow Condensed", sans-serif';
  ctx.fillText(title, 92, 272);

  // 副标题
  if (subtitle) {
    ctx.font = '500 34px "DM Sans", sans-serif';
    ctx.fillText(subtitle, 98, 332);
  }

  // 右上角编号
  if (index) {
    ctx.font = '600 38px "DM Sans", sans-serif';
    ctx.textAlign = "right";
    ctx.fillText(index, 930, 104);
  }

  // 分隔线
  ctx.strokeStyle = foreground;
  ctx.globalAlpha = 0.34;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(94, 392);
  ctx.lineTo(930, 392);
  ctx.stroke();

  ctx.globalAlpha = 1;

  // 中央图标
  drawIcon(ctx, icon, 512, 760, 320, foreground);

  // 底部圆角框
  drawRoundedRect(ctx, 92, 1120, 840, 74, 37);

  ctx.strokeStyle = foreground;
  ctx.globalAlpha = 0.24;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.globalAlpha = 1;

  ctx.font = '600 25px "DM Sans", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("AUTOPLAY / THREE.JS", 512, 1167);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;

  return texture;
}

// ============================================================================
// 5. 创建 3D 卡片
// ============================================================================

function createCard({
                      background,
                      foreground,
                      title,
                      subtitle,
                      index,
                      icon,
                      z = 0,
                    }) {
  const geometry = new THREE.BoxGeometry(
      CARD_WIDTH,
      CARD_HEIGHT,
      CARD_DEPTH,
      2,
      2,
      1
  );

  const frontTexture = createCardTexture({
    background,
    foreground,
    title,
    subtitle,
    index,
    icon,
  });

  const backTexture = createCardTexture({
    background,
    foreground,
    title,
    subtitle,
    index,
    icon,
    back: true,
  });

  // 侧面稍暗，用于突出卡片厚度
  const sideColor = new THREE.Color(background).multiplyScalar(0.82);

  const sideMaterials = Array.from(
      { length: 4 },
      () =>
          new THREE.MeshStandardMaterial({
            color: sideColor,
            roughness: 0.78,
            metalness: 0,
          })
  );

  const frontMaterial = new THREE.MeshPhysicalMaterial({
    map: frontTexture,
    roughness: 0.72,
    metalness: 0,
    clearcoat: 0.08,
    clearcoatRoughness: 0.65,
  });

  const backMaterial = new THREE.MeshPhysicalMaterial({
    map: backTexture,
    roughness: 0.78,
    metalness: 0,
    clearcoat: 0.05,
  });

  // BoxGeometry：前四个材质为侧面，第五个正面，第六个背面
  const materials = [
    ...sideMaterials,
    frontMaterial,
    backMaterial,
  ];

  const mesh = new THREE.Mesh(geometry, materials);

  mesh.position.z = z;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // 保存需要在 destroy() 中主动释放的 GPU 资源
  mesh.userData.resources = {
    geometry,
    materials,
    textures: [frontTexture, backTexture],
  };

  return mesh;
}

// ============================================================================
// 6. 初始化 Three.js
// ============================================================================

function init() {
  const root = document.querySelector("#app");
  const hero = root?.querySelector(".hero");
  const heroHeadline = root?.querySelector(".hero-content h1");
  const container = root?.querySelector(".three-container");

  if (!root || !hero || !heroHeadline || !container) {
    return;
  }

  // ==========================================================================
  // Renderer
  // ==========================================================================

  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
  } catch (error) {
    console.error("WebGL initialization failed:", error);

    const fallback = document.createElement("div");
    fallback.className = "webgl-fallback";
    fallback.textContent =
        "This experience requires WebGL support.";

    container.appendChild(fallback);
    return;
  }

  // ==========================================================================
  // Scene / Camera
  // ==========================================================================

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
      35,
      1,
      0.1,
      100
  );

  camera.position.set(0, 0, 8);
  camera.lookAt(0, 0, 0);

  // ==========================================================================
  // Renderer 配置
  // ==========================================================================

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, 2)
  );

  container.appendChild(renderer.domElement);

  // ==========================================================================
  // 灯光
  // ==========================================================================

  const ambientLight = new THREE.AmbientLight(
      0xffffff,
      1.5
  );
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(
      0xffffff,
      2
  );

  keyLight.position.set(3, 5, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);

  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(
      0xdde7ff,
      0.65
  );

  fillLight.position.set(-4, -1, 4);
  scene.add(fillLight);

  // ==========================================================================
  // 卡片组
  // ==========================================================================

  const cardsGroup = new THREE.Group();

  // 初始位于屏幕下方
  cardsGroup.position.y = -1.5;

  scene.add(cardsGroup);

  // 最前面的黄色卡片
  const frontCard = createCard({
    background: "#8e4aaf",
    foreground: "#0f0f0f",
    title: "FIRST FRAME",
    subtitle: "Start here",
    index: "00",
    icon: "chevron",
    z: 0.12,
  });

  const labels = [
    "BREATHE",
    "MOVE",
    "NOTICE",
    "REST",
  ];

  const icons = [
    "leaf",
    "footsteps",
    "eye",
    "moon",
  ];

  // 后方四张卡片
  const backCards = labels.map((title, i) => {
    const card = createCard({
      background: cardColors[i],
      foreground: cardTextColors[i],
      title,
      subtitle: "",
      index: String(i + 1).padStart(2, "0"),
      icon: icons[i],
      z: backCardPositions[i].z,
    });

    card.position.x = backCardPositions[i].x;

    // 初始显示背面
    card.rotation.y = -Math.PI;

    return card;
  });

  cardsGroup.add(frontCard, ...backCards);

  const resourceCards = [
    frontCard,
    ...backCards,
  ];

  // ==========================================================================
  // 页面尺寸与卡片响应式缩放
  // ==========================================================================

  let width = 0;
  let height = 0;

  function updateCardScale() {
    const distance = Math.abs(
        camera.position.z - cardsGroup.position.z
    );

    const visibleHeight =
        2 *
        Math.tan(
            THREE.MathUtils.degToRad(camera.fov / 2)
        ) *
        distance;

    const visibleWidth =
        visibleHeight * camera.aspect;

    const widthScale =
        (visibleWidth * 0.82) / CARD_WIDTH;

    const heightScale =
        (visibleHeight * 0.78) / CARD_HEIGHT;

    const scale = clamp(
        0.52,
        1,
        Math.min(widthScale, heightScale, 1)
    );

    cardsGroup.scale.setScalar(scale);
  }

  function handleResize() {
    width =
        container.clientWidth ||
        window.innerWidth;

    height =
        container.clientHeight ||
        window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height, false);

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
    );

    updateCardScale();
  }

  handleResize();

  window.addEventListener(
      "resize",
      handleResize,
      { passive: true }
  );

  // ==========================================================================
  // 翻牌动画状态
  // ==========================================================================

  let isFlipped = false;
  let isFlipAnimating = false;
  let flipTimeline = null;

  const flipThreshold =
      unitToProgress(CARD_FLIP_TRIGGER);

  const dismissThreshold =
      unitToProgress(CARD_DISMISS_START);

  function killFlipTimeline() {
    if (!flipTimeline) {
      return;
    }

    flipTimeline.kill();
    flipTimeline = null;
  }

  // ==========================================================================
  // 翻开卡片
  // ==========================================================================

  function revealBackCards() {
    killFlipTimeline();

    isFlipAnimating = true;

    flipTimeline = gsap.timeline({
      defaults: {
        duration: 1,
        ease: "elastic.out(1, 0.5)",
      },
      onComplete: () => {
        isFlipAnimating = false;
      },
    });

    // 前方黄色卡片翻走
    flipTimeline.to(
        frontCard.rotation,
        { y: Math.PI },
        0
    );

    flipTimeline.call(
        () => {
          frontCard.position.z = -0.48;
        },
        [],
        0
    );

    // 后方四张卡片同时翻到正面
    backCards.forEach((card, i) => {
      flipTimeline.to(
          card.rotation,
          {
            y: 0,
            z: degToRad(cardFlipTiltAngles[i]),
          },
          0
      );
    });
  }

  // ==========================================================================
  // 自动播放状态
  // ==========================================================================

  const playback = {
    progress: 0,
  };

  // ==========================================================================
  // 根据总 progress 更新场景
  // ==========================================================================

  function updateSequence(progress) {
    // ------------------------------------------------------------------------
    // 1. 卡片入场
    // ------------------------------------------------------------------------

    const enterProgress = clamp(
        0,
        1,
        mapRange(
            0,
            unitToProgress(CARDS_ENTER_END),
            0,
            1,
            progress
        )
    );

    cardsGroup.position.y = mapRange(
        0,
        1,
        -1.5,
        0,
        enterProgress
    );

    gsap.set(heroHeadline, {
      yPercent: mapRange(
          0,
          1,
          0,
          -100,
          enterProgress
      ),
    });

    // ------------------------------------------------------------------------
    // 2. 到达阈值后翻牌
    // ------------------------------------------------------------------------

    if (
        progress > flipThreshold &&
        !isFlipped
    ) {
      revealBackCards();
      isFlipped = true;
    }

    // ------------------------------------------------------------------------
    // 3. 四张卡片依次抽离
    //
    // backCards:
    // i=0 -> 最上层
    // i=3 -> 最下层
    //
    // 因此按 i 顺序抽离即：
    // 1 -> 2 -> 3 -> 4
    // ------------------------------------------------------------------------

    backCards.forEach((card, i) => {
      const dismissOrder = i;

      const dismissStart = unitToProgress(
          CARD_DISMISS_START +
          dismissOrder * CARD_DISMISS_DURATION
      );

      const dismissEnd = unitToProgress(
          CARD_DISMISS_START +
          (dismissOrder + 1) *
          CARD_DISMISS_DURATION
      );

      // 翻牌之前保持初始位置
      if (progress <= flipThreshold) {
        card.position.y = 0;
        card.position.x =
            backCardPositions[i].x;

        return;
      }

      const dismissProgress = clamp(
          0,
          1,
          mapRange(
              dismissStart,
              dismissEnd,
              0,
              1,
              progress
          )
      );

      // 向上飞出
      card.position.y = THREE.MathUtils.lerp(
          0,
          4.5,
          dismissProgress
      );

      // 左右轻微甩出
      const xOffset =
          i % 2 === 0 ? -0.24 : 0.24;

      card.position.x = THREE.MathUtils.lerp(
          backCardPositions[i].x,
          backCardPositions[i].x + xOffset,
          dismissProgress
      );

      // 抽离过程中增加 Z 轴旋转
      if (
          dismissProgress > 0 ||
          (
              !isFlipAnimating &&
              progress >= dismissThreshold
          )
      ) {
        card.rotation.z = THREE.MathUtils.lerp(
            degToRad(cardFlipTiltAngles[i]),
            degToRad(cardDismissTiltAngles[i]),
            dismissProgress
        );
      } else if (!isFlipAnimating) {
        card.rotation.z =
            degToRad(cardFlipTiltAngles[i]);
      }
    });
  }

  // ==========================================================================
  // 重置动画
  // ==========================================================================

  function resetSequence() {
    killFlipTimeline();

    isFlipped = false;
    isFlipAnimating = false;

    frontCard.visible = true;
    frontCard.position.z = 0.12;
    frontCard.rotation.set(0, 0, 0);

    backCards.forEach((card, i) => {
      card.visible = true;

      card.position.set(
          backCardPositions[i].x,
          0,
          backCardPositions[i].z
      );

      // 背面对着相机
      card.rotation.set(
          0,
          -Math.PI,
          0
      );
    });

    playback.progress = 0;
    updateSequence(0);
  }

  resetSequence();

  // ==========================================================================
  // 自动播放 Timeline
  // ==========================================================================

  const autoplayTimeline = gsap
      .timeline({
        repeat: -1,
        repeatDelay: AUTOPLAY_REPEAT_DELAY,
        onRepeat: resetSequence,
      })
      .to(playback, {
        progress: 1,
        duration: AUTOPLAY_DURATION,
        ease: "none",
        onUpdate: () =>
            updateSequence(playback.progress),
      });

  // ==========================================================================
  // 页面不可见时暂停动画
  // ==========================================================================

  const handleVisibilityChange = () => {
    if (document.hidden) {
      autoplayTimeline.pause();
    } else {
      autoplayTimeline.resume();
    }
  };

  document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
  );

  // ==========================================================================
  // Three.js 渲染循环
  // ==========================================================================

  let frameId = 0;
  let destroyed = false;

  function render() {
    if (destroyed) {
      return;
    }

    renderer.render(scene, camera);
    frameId = requestAnimationFrame(render);
  }

  render();

  // ==========================================================================
  // 销毁资源
  // ==========================================================================

  function destroy() {
    if (destroyed) {
      return;
    }

    destroyed = true;

    cancelAnimationFrame(frameId);

    killFlipTimeline();
    autoplayTimeline.kill();

    document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
    );

    window.removeEventListener(
        "resize",
        handleResize
    );

    // 释放 Geometry / Material / Texture
    resourceCards.forEach((card) => {
      const {
        geometry,
        materials,
        textures,
      } = card.userData.resources;

      geometry.dispose();

      materials.forEach((material) =>
          material.dispose()
      );

      textures.forEach((texture) =>
          texture.dispose()
      );
    });

    renderer.dispose();
    renderer.domElement.remove();
  }

  // 页面关闭时清理
  window.addEventListener(
      "beforeunload",
      destroy,
      { once: true }
  );

  // Vite HMR 时清理旧场景
  if (import.meta.hot) {
    import.meta.hot.dispose(destroy);
  }

  return destroy;
}

// ============================================================================
// 7. 等待字体加载完成后初始化
// ============================================================================
//
// 卡片文字直接绘制到 CanvasTexture。
// 如果字体尚未加载就调用 fillText()，后续字体加载完成后纹理不会自动重绘。
// 因此优先等待 document.fonts.ready。
//

if (document.fonts?.ready) {
  document.fonts.ready.then(init);
} else {
  init();
}
