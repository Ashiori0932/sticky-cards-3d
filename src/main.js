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
const CARDS_ENTER_START = 100;
const CARDS_ENTER_END = 200;
const CARD_FLIP_TRIGGER = 300;
const CARD_DISMISS_START = 400;
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
  // 获取页面中的主要 DOM 元素
  const root = document.querySelector("#app");
  const hero = root?.querySelector(".hero");
  const heroHeadline = root?.querySelector(".hero-content h1");
  const container = root?.querySelector(".three-container");

  // 必要元素不存在时直接退出
  if (!root || !hero || !heroHeadline || !container) {
    return;
  }

  // ==========================================================================
  // Renderer
  // ==========================================================================

  let renderer;

  try {
    // 创建支持透明背景和抗锯齿的 WebGL 渲染器
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
  } catch (error) {
    console.error("WebGL initialization failed:", error);

    // WebGL 不可用时显示提示信息
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

  // 创建 Three.js 场景
  const scene = new THREE.Scene();

  // 创建透视相机
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

  // 设置颜色空间、阴影和像素比例
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

  // 环境光：提供整体基础亮度
  const ambientLight = new THREE.AmbientLight(
      0xffffff,
      1.5
  );
  scene.add(ambientLight);

  // 主光源：提供主要照明和阴影
  const keyLight = new THREE.DirectionalLight(
      0xffffff,
      2
  );

  keyLight.position.set(3, 5, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);

  scene.add(keyLight);

  // 补光：减弱背光区域的黑暗程度
  const fillLight = new THREE.DirectionalLight(
      0xdde7ff,
      0.65
  );

  fillLight.position.set(-4, -1, 4);
  scene.add(fillLight);

  // ==========================================================================
  // 卡片组
  // ==========================================================================

  // 所有卡片统一放入一个 Group 中控制
  const cardsGroup = new THREE.Group();

  // 初始位于屏幕下方
  cardsGroup.position.y = -6;

  scene.add(cardsGroup);

  // 创建最前面的封面卡片
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

  // 创建后方四张卡片
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

    // 设置各卡片初始横向位置
    card.position.x = backCardPositions[i].x;

    // 初始背面对着相机
    card.rotation.y = -Math.PI;

    return card;
  });

  // 将所有卡片加入卡片组
  cardsGroup.add(frontCard, ...backCards);

  // 保存需要在销毁时释放资源的卡片
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
    // 计算卡片组与相机之间的距离
    const distance = Math.abs(
        camera.position.z - cardsGroup.position.z
    );

    // 计算当前相机视野对应的可见高度
    const visibleHeight =
        2 *
        Math.tan(
            THREE.MathUtils.degToRad(camera.fov / 2)
        ) *
        distance;

    const visibleWidth =
        visibleHeight * camera.aspect;

    // 根据屏幕宽高分别计算缩放比例
    const widthScale =
        (visibleWidth * 0.82) / CARD_WIDTH;

    const heightScale =
        (visibleHeight * 0.78) / CARD_HEIGHT;

    // 限制卡片缩放范围
    const scale = clamp(
        0.52,
        1,
        Math.min(widthScale, heightScale, 1)
    );

    cardsGroup.scale.setScalar(scale);
  }

  function handleResize() {
    // 获取容器当前尺寸
    width =
        container.clientWidth ||
        window.innerWidth;

    height =
        container.clientHeight ||
        window.innerHeight;

    // 更新相机宽高比
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // 更新渲染尺寸
    renderer.setSize(width, height, false);

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
    );

    // 根据新尺寸调整卡片大小
    updateCardScale();
  }

  // 初始化页面尺寸
  handleResize();

  // 页面尺寸变化时重新适配
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

  // 将配置值转换为整个动画的 progress 阈值
  const flipThreshold =
      unitToProgress(CARD_FLIP_TRIGGER);

  const dismissThreshold =
      unitToProgress(CARD_DISMISS_START);

  function killFlipTimeline() {
    if (!flipTimeline) {
      return;
    }

    // 停止并清除当前翻牌动画
    flipTimeline.kill();
    flipTimeline = null;
  }

  // ==========================================================================
  // 翻开卡片
  // ==========================================================================

  function revealBackCards() {
    // 防止旧 Timeline 与新动画冲突
    killFlipTimeline();

    isFlipAnimating = true;

    // 创建带弹性效果的翻牌动画
    flipTimeline = gsap.timeline({
      defaults: {
        duration: 1,
        ease: "elastic.out(1, 0.5)",
      },
      onComplete: () => {
        isFlipAnimating = false;
      },
    });

    // 前方卡片翻到背面
    flipTimeline.to(
        frontCard.rotation,
        { y: Math.PI },
        0
    );

    // 同时将前方卡片移动到后面
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

  // progress 从 0 增长到 1，驱动整个动画流程
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

    // 将当前总进度映射为卡片入场阶段的 0~1 进度
    const enterProgress = clamp(
        0,
        1,
        mapRange(
            unitToProgress(CARDS_ENTER_START),
            unitToProgress(CARDS_ENTER_END),
            0,
            1,
            progress
        )
    );

    // 卡片从屏幕下方向中心移动
    cardsGroup.position.y = mapRange(
        0,
        1,
        -6,
        0,
        enterProgress
    );

    // 标题随卡片入场向上移出屏幕
    gsap.set(heroHeadline, {
      yPercent: mapRange(
          0,
          1,
          0,
          -500,
          enterProgress
      ),
    });

    // ------------------------------------------------------------------------
    // 2. 到达阈值后翻牌
    // ------------------------------------------------------------------------

    // 第一次越过翻牌阈值时执行翻牌动画
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
      // 当前卡片的抽离顺序
      const dismissOrder = i;

      // 计算当前卡片抽离动画的起止进度
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

      // 将当前总进度转换为该卡片自身的抽离进度
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
          6,
          dismissProgress
      );

      // 根据卡片序号交替向左右轻微甩出
      const xOffset =
          i % 2 === 0 ? -0.24 : 0.24;

      card.position.x = THREE.MathUtils.lerp(
          backCardPositions[i].x,
          backCardPositions[i].x + xOffset,
          dismissProgress
      );

      // 抽离过程中逐渐增加 Z 轴旋转
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
        // 尚未抽离时恢复翻牌后的倾斜角度
        card.rotation.z =
            degToRad(cardFlipTiltAngles[i]);
      }
    });
  }

  // ==========================================================================
  // 重置动画
  // ==========================================================================

  function resetSequence() {
    // 停止可能仍在执行的翻牌动画
    killFlipTimeline();

    // 重置动画状态
    isFlipped = false;
    isFlipAnimating = false;

    // 重置前方卡片
    frontCard.visible = true;
    frontCard.position.z = 0.12;
    frontCard.rotation.set(0, 0, 0);

    // 重置后方四张卡片
    backCards.forEach((card, i) => {
      card.visible = true;

      card.position.set(
          backCardPositions[i].x,
          0,
          backCardPositions[i].z
      );

      // 恢复为背面对着相机
      card.rotation.set(
          0,
          -Math.PI,
          0
      );
    });

    // 从动画起点重新开始
    playback.progress = 0;
    updateSequence(0);
  }

  // 初始化动画状态
  resetSequence();

  // ==========================================================================
  // 自动播放 Timeline
  // ==========================================================================

  // 循环推动 progress 从 0 到 1
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
    // 切换标签页时暂停，回来后继续播放
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

    // 渲染当前场景并进入下一帧
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(render);
  }

  render();

  // ==========================================================================
  // 销毁资源
  // ==========================================================================

  function destroy() {
    // 防止重复销毁
    if (destroyed) {
      return;
    }

    destroyed = true;

    // 停止渲染循环
    cancelAnimationFrame(frameId);

    // 停止 GSAP 动画
    killFlipTimeline();
    autoplayTimeline.kill();

    // 移除事件监听
    document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
    );

    window.removeEventListener(
        "resize",
        handleResize
    );

    // 释放每张卡片占用的 Three.js GPU 资源
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

    // 释放渲染器并移除 Canvas
    renderer.dispose();
    renderer.domElement.remove();
  }

  // 页面关闭时释放资源
  window.addEventListener(
      "beforeunload",
      destroy,
      { once: true }
  );

  // Vite 热更新时释放旧场景，避免资源重复创建
  if (import.meta.hot) {
    import.meta.hot.dispose(destroy);
  }

  // 返回销毁函数，允许外部主动清理
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
