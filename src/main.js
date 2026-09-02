// 引入页面样式
import "./style.css";

// 引入 Three.js，用于创建 3D 场景、相机、卡片、灯光等
import * as THREE from "three";

// 引入 GSAP，用于控制动画时间轴和各种缓动动画
import { gsap } from "gsap";


// ============================================================================
// 1. 卡片基础尺寸
// ============================================================================

// 卡片宽度
const CARD_WIDTH = 3;

// 卡片高度
const CARD_HEIGHT = 3.75;

// 卡片厚度
const CARD_DEPTH = 0.06;


// ============================================================================
// 2. 整体动画时间轴参数
// ============================================================================

// 卡片组从下方向中央移动的动画结束位置
const CARDS_ENTER_END = 100;

// 到达这个时间单位以后触发翻牌动画
const CARD_FLIP_TRIGGER = 200;

// 从这个位置开始逐张抽走后面的卡片
const CARD_DISMISS_START = 300;

// 每张卡片抽离占用的逻辑时间长度
const CARD_DISMISS_DURATION = 100;

// 后方卡片数量
const STICKY_CARD_COUNT = 4;

// 整个动画序列总长度
const TOTAL_SEQUENCE_UNITS =
    CARD_DISMISS_START + STICKY_CARD_COUNT * CARD_DISMISS_DURATION;

// 一整个自动播放动画持续 14 秒
const AUTOPLAY_DURATION = 7;

// 每轮动画播放完成后停顿 1.5 秒再重新开始
const AUTOPLAY_REPEAT_DELAY = 1.5;


// ============================================================================
// 3. 四张后方卡片的动画参数
// ============================================================================

// 翻牌完成以后，四张卡片最终形成扇形时的 Z 轴旋转角度
const cardFlipTiltAngles = [-10, -20, -5, 10];

// 卡片向上抽离时最终旋转到的角度
const cardDismissTiltAngles = [-50, -60, -45, 50];

// 四张卡片的背景颜色
const cardColors = [
  "#f0fd00", // 第1张：黄色
  "#dfebe0", // 第2张：浅灰绿色
  "#8c26fd", // 第3张：紫色
  "#9bfd40", // 第4张：绿色
];

// 四张卡片对应的文字颜色
const cardTextColors = [
  "#0f0f0f",
  "#0f0f0f",
  "#ffffff",
  "#0f0f0f",
];

// 四张后方卡片初始位置
// 注意：Three.js 中相机位于 z = 8，朝向原点。
// 因此 Z 越大越靠近相机。
const backCardPositions = [
  // Z 间距必须大于卡片厚度，避免翻转时实体几何互相穿模。
  { x: -0.05, z: -0.08 },
  { x: 0.03, z: -0.18 },
  { x: -0.02, z: -0.28 },
  { x: 0.04, z: -0.38 },
];


// ============================================================================
// 4. 工具函数
// ============================================================================

// 将角度转换为弧度
const degToRad = THREE.MathUtils.degToRad;

// GSAP 的数值限制函数
const clamp = gsap.utils.clamp;

// GSAP 的范围映射函数
const mapRange = gsap.utils.mapRange;

// 时间转换成单位进度
function unitToProgress(unit) {
  return unit / TOTAL_SEQUENCE_UNITS;
}

// Canvas 工具函数：绘制圆角矩形路径
function drawRoundedRect(ctx, x, y, width, height, radius) {
  // 半径不能超过矩形宽高的一半
  const r = Math.min(radius, width / 2, height / 2);

  // 开始创建路径
  ctx.beginPath();

  // 从左上角圆角的右侧开始
  ctx.moveTo(x + r, y);

  // 右上角
  ctx.arcTo(
      x + width,
      y,
      x + width,
      y + height,
      r
  );

  // 右下角
  ctx.arcTo(
      x + width,
      y + height,
      x,
      y + height,
      r
  );

  // 左下角
  ctx.arcTo(
      x,
      y + height,
      x,
      y,
      r
  );

  // 左上角
  ctx.arcTo(
      x,
      y,
      x + width,
      y,
      r
  );

  // 闭合路径
  ctx.closePath();
}

// Canvas 工具函数：根据类型绘制图标
function drawIcon(ctx, type, x, y, size, color) {
  // 保存 Canvas 当前状态
  ctx.save();

  // 将坐标原点移动到图标中心
  //
  // 后面的图标绘制都可以围绕 (0, 0) 进行。
  ctx.translate(x, y);

  // 设置描边和填充颜色
  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  // 根据图标大小动态计算线宽
  ctx.lineWidth = Math.max(8, size * 0.055);

  // 让线条端点和连接处更加圆润
  ctx.lineCap = "round";
  ctx.lineJoin = "round";


  // --------------------------------------------------------------------------
  // chevron：向下箭头
  // --------------------------------------------------------------------------

  if (type === "chevron") {
    ctx.beginPath();

    ctx.moveTo(
        -size * 0.34,
        -size * 0.08
    );

    ctx.lineTo(
        0,
        size * 0.25
    );

    ctx.lineTo(
        size * 0.34,
        -size * 0.08
    );

    ctx.stroke();
  }


  // --------------------------------------------------------------------------
  // leaf：叶子
  // --------------------------------------------------------------------------

  if (type === "leaf") {
    // 绘制叶片外轮廓
    ctx.beginPath();

    ctx.moveTo(
        -size * 0.32,
        size * 0.2
    );

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

    // 绘制叶脉
    ctx.beginPath();

    ctx.moveTo(
        -size * 0.28,
        size * 0.22
    );

    ctx.lineTo(
        size * 0.22,
        -size * 0.22
    );

    ctx.stroke();
  }


  // --------------------------------------------------------------------------
  // footsteps：脚印
  // --------------------------------------------------------------------------

  if (type === "footsteps") {

    // 内部辅助函数：绘制单个脚印
    const foot = (ox, oy, rot) => {
      ctx.save();

      // 移动到对应脚印位置
      ctx.translate(ox, oy);

      // 旋转脚印
      ctx.rotate(rot);

      // 脚掌
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

      // 脚趾
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

    // 左脚
    foot(
        -size * 0.16,
        size * 0.12,
        -0.25
    );

    // 右脚
    foot(
        size * 0.16,
        -size * 0.12,
        0.25
    );
  }


  // --------------------------------------------------------------------------
  // eye：眼睛
  // --------------------------------------------------------------------------

  if (type === "eye") {

    // 眼睛外轮廓
    ctx.beginPath();

    ctx.moveTo(
        -size * 0.42,
        0
    );

    ctx.quadraticCurveTo(
        0,
        -size * 0.34,
        size * 0.42,
        0
    );

    ctx.quadraticCurveTo(
        0,
        size * 0.34,
        -size * 0.42,
        0
    );

    ctx.stroke();

    // 瞳孔
    ctx.beginPath();

    ctx.arc(
        0,
        0,
        size * 0.105,
        0,
        Math.PI * 2
    );

    ctx.fill();
  }


  // --------------------------------------------------------------------------
  // moon：月亮
  // --------------------------------------------------------------------------

  if (type === "moon") {

    ctx.beginPath();

    // 先绘制大圆弧
    ctx.arc(
        0,
        0,
        size * 0.32,
        Math.PI * 0.25,
        Math.PI * 1.75,
        false
    );

    // 使用贝塞尔曲线向内部收口，
    // 最终形成月牙形状。
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


  // 恢复进入函数前的 Canvas 状态
  ctx.restore();
}



// 创建卡片纹理
// back = false：生成正面纹理
// back = true ：生成背面纹理

function createCardTexture({
                             background,
                             foreground,
                             title,
                             subtitle,
                             index,
                             icon,
                             back = false,
                           }) {

  // 创建一个离屏 Canvas
  const canvas = document.createElement("canvas");

  // 使用较高分辨率，保证在 3D 场景中显示清晰
  canvas.width = 1024;
  canvas.height = 1280;

  // alpha:false 表示 Canvas 不需要透明背景
  const ctx = canvas.getContext(
      "2d",
      { alpha: false }
  );


  // --------------------------------------------------------------------------
  // 绘制基础背景
  // --------------------------------------------------------------------------

  ctx.fillStyle = background;

  ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
  );


  // ==========================================================================
  // 卡片背面
  // ==========================================================================

  if (back) {

    // ------------------------------------------------------------------------
    // 绘制背面的斜线纹理
    // ------------------------------------------------------------------------

    ctx.save();

    // 将坐标中心移动到 Canvas 中央
    ctx.translate(
        canvas.width / 2,
        canvas.height / 2
    );

    // 整个斜线纹理旋转 -22.5°
    ctx.rotate(-Math.PI / 8);

    // 设置较低透明度
    ctx.globalAlpha = 0.08;

    ctx.strokeStyle = foreground;

    ctx.lineWidth = 2;

    // 绘制大量平行竖线。
    //
    // 因为整个 Canvas 坐标系已经旋转，
    // 最终看到的是斜线。
    for (let i = -1000; i <= 1000; i += 64) {

      ctx.beginPath();

      ctx.moveTo(
          i,
          -900
      );

      ctx.lineTo(
          i,
          900
      );

      ctx.stroke();
    }

    ctx.restore();


    // ------------------------------------------------------------------------
    // 绘制背面文字
    // ------------------------------------------------------------------------

    ctx.globalAlpha = 1;

    ctx.fillStyle = foreground;

    // 主标题字体
    ctx.font =
        '900 90px "Barlow Condensed", sans-serif';

    ctx.textAlign = "center";

    ctx.fillText(
        "STICKY / 3D",
        512,
        610
    );


    // 副标题字体
    ctx.font =
        '500 26px "DM Sans", sans-serif';

    ctx.fillText(
        "TURN THE CARD · FOLLOW THE MOTION",
        512,
        674
    );


    // ------------------------------------------------------------------------
    // 将 Canvas 转换为 Three.js 纹理
    // ------------------------------------------------------------------------

    const texture =
        new THREE.CanvasTexture(canvas);

    // 指定纹理颜色空间
    texture.colorSpace =
        THREE.SRGBColorSpace;

    // 各向异性过滤，提高倾斜显示时纹理清晰度
    texture.anisotropy = 8;

    // 强制通知 Three.js 更新纹理
    texture.needsUpdate = true;

    return texture;
  }


  // ==========================================================================
  // 卡片正面
  // ==========================================================================


  // --------------------------------------------------------------------------
  // 绘制稀疏的点状背景纹理
  // --------------------------------------------------------------------------

  ctx.globalAlpha = 0.08;

  ctx.fillStyle = foreground;

  for (let y = 90; y < 1190; y += 48) {

    for (let x = 90; x < 950; x += 48) {

      // 只在部分格点绘制，
      // 避免背景点过于密集。
      if (((x + y) / 48) % 5 === 0) {

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            1.4,
            0,
            Math.PI * 2
        );

        ctx.fill();
      }
    }
  }

  // 恢复正常透明度
  ctx.globalAlpha = 1;


  // --------------------------------------------------------------------------
  // 绘制卡片主标题
  // --------------------------------------------------------------------------

  ctx.fillStyle = foreground;

  ctx.textAlign = "left";

  ctx.textBaseline = "alphabetic";

  ctx.font =
      '900 166px "Barlow Condensed", sans-serif';

  ctx.fillText(
      title,
      92,
      272
  );


  // --------------------------------------------------------------------------
  // 绘制副标题
  // --------------------------------------------------------------------------

  if (subtitle) {

    ctx.font =
        '500 34px "DM Sans", sans-serif';

    ctx.fillText(
        subtitle,
        98,
        332
    );
  }


  // --------------------------------------------------------------------------
  // 绘制右上角编号
  // --------------------------------------------------------------------------

  if (index) {

    ctx.font =
        '600 38px "DM Sans", sans-serif';

    ctx.textAlign = "right";

    ctx.fillText(
        index,
        930,
        104
    );
  }


  // --------------------------------------------------------------------------
  // 绘制标题区域下方分隔线
  // --------------------------------------------------------------------------

  ctx.strokeStyle = foreground;

  ctx.globalAlpha = 0.34;

  ctx.lineWidth = 2;

  ctx.beginPath();

  ctx.moveTo(
      94,
      392
  );

  ctx.lineTo(
      930,
      392
  );

  ctx.stroke();

  ctx.globalAlpha = 1;


  // --------------------------------------------------------------------------
  // 绘制卡片中央图标
  // --------------------------------------------------------------------------

  drawIcon(
      ctx,
      icon,
      512,
      760,
      320,
      foreground
  );


  // --------------------------------------------------------------------------
  // 绘制卡片底部圆角框
  // --------------------------------------------------------------------------

  drawRoundedRect(
      ctx,
      92,
      1120,
      840,
      74,
      37
  );

  ctx.strokeStyle = foreground;

  ctx.globalAlpha = 0.24;

  ctx.lineWidth = 2;

  ctx.stroke();

  ctx.globalAlpha = 1;


  // --------------------------------------------------------------------------
  // 绘制底部说明文字
  // --------------------------------------------------------------------------

  ctx.font =
      '600 25px "DM Sans", sans-serif';

  ctx.textAlign = "center";

  ctx.fillText(
      "AUTOPLAY / THREE.JS",
      512,
      1167
  );


  // --------------------------------------------------------------------------
  // Canvas -> Three.js 纹理
  // --------------------------------------------------------------------------

  const texture =
      new THREE.CanvasTexture(canvas);

  texture.colorSpace =
      THREE.SRGBColorSpace;

  texture.anisotropy = 8;

  texture.needsUpdate = true;

  return texture;
}


// 创建 3D 卡片

function createCard({
                      background,
                      foreground,
                      title,
                      subtitle,
                      index,
                      icon,
                      z = 0,
                    }) {

  // --------------------------------------------------------------------------
  // 创建卡片几何体
  // --------------------------------------------------------------------------

  const geometry =
      new THREE.BoxGeometry(
          CARD_WIDTH,
          CARD_HEIGHT,
          CARD_DEPTH,
          2,
          2,
          1
      );


  // --------------------------------------------------------------------------
  // 创建正面纹理
  // --------------------------------------------------------------------------

  const frontTexture = createCardTexture({
    background,
    foreground,
    title,
    subtitle,
    index,
    icon,
  });


  // --------------------------------------------------------------------------
  // 创建背面纹理
  // --------------------------------------------------------------------------

  const backTexture = createCardTexture({
    background,
    foreground,
    title,
    subtitle,
    index,
    icon,
    back: true,
  });


  // --------------------------------------------------------------------------
  // 创建侧面颜色
  // --------------------------------------------------------------------------
  //
  // multiplyScalar(0.82)
  // 会让卡片侧面比正面稍暗，
  // 从而更容易看出实体厚度。
  //

  const sideColor =
      new THREE.Color(background)
          .multiplyScalar(0.82);


  // 四个侧面分别创建材质
  const sideMaterials =
      Array.from(
          { length: 4 },
          () =>
              new THREE.MeshStandardMaterial({
                color: sideColor,

                // 粗糙度较高，
                // 减少侧面过强的高光。
                roughness: 0.78,

                // 非金属材质
                metalness: 0,
              })
      );


  // --------------------------------------------------------------------------
  // 正面材质
  // --------------------------------------------------------------------------

  const frontMaterial =
      new THREE.MeshPhysicalMaterial({

        // 正面纹理
        map: frontTexture,

        roughness: 0.72,

        metalness: 0,

        // 少量清漆效果
        clearcoat: 0.08,

        clearcoatRoughness: 0.65,
      });


  // --------------------------------------------------------------------------
  // 背面材质
  // --------------------------------------------------------------------------

  const backMaterial =
      new THREE.MeshPhysicalMaterial({

        map: backTexture,

        roughness: 0.78,

        metalness: 0,

        clearcoat: 0.05,
      });


  // --------------------------------------------------------------------------
  // BoxGeometry 六个面的材质
  // --------------------------------------------------------------------------
  //
  // 前四个：侧面
  // 第五个：正面
  // 第六个：背面
  //

  const materials = [
    ...sideMaterials,
    frontMaterial,
    backMaterial,
  ];


  // 使用几何体 + 材质创建 Mesh
  const mesh =
      new THREE.Mesh(
          geometry,
          materials
      );


  // 设置卡片 Z 位置
  mesh.position.z = z;


  // 允许卡片产生阴影
  mesh.castShadow = true;

  // 允许卡片接收阴影
  mesh.receiveShadow = true;


  // --------------------------------------------------------------------------
  // 保存需要手动释放的 GPU 资源
  // --------------------------------------------------------------------------
  //
  // Three.js 的 Geometry / Material / Texture
  // 不会因为 JavaScript 对象被 GC 自动释放 GPU 资源。
  //
  // 因此这里提前存入 userData，
  // destroy() 时统一 dispose()。
  //

  mesh.userData.resources = {
    geometry,
    materials,
    textures: [
      frontTexture,
      backTexture,
    ],
  };


  return mesh;
}


// ============================================================================
// 10. 初始化 Three.js 场景
// ============================================================================

function init() {

  // --------------------------------------------------------------------------
  // 获取页面 DOM 元素
  // --------------------------------------------------------------------------

  const root =
      document.querySelector("#app");

  // hero 整体区域
  const hero =
      root?.querySelector(".hero");

  // Hero 主标题
  const heroHeadline =
      root?.querySelector(
          ".hero-content h1"
      );

  // Three.js Canvas 容器
  const container =
      root?.querySelector(
          ".three-container"
      );


  // 任意必要元素不存在时停止初始化
  if (
      !root ||
      !hero ||
      !heroHeadline ||
      !container
  ) {
    return;
  }


  // ==========================================================================
  // 11. 创建 WebGL Renderer
  // ==========================================================================

  let renderer;

  try {

    renderer =
        new THREE.WebGLRenderer({

          // 开启抗锯齿
          antialias: true,

          // Canvas 背景允许透明
          alpha: true,
        });

  } catch (error) {

    // 浏览器或者显卡不支持 WebGL 时进入这里
    console.error(
        "WebGL initialization failed:",
        error
    );


    // 创建一个简单的 HTML fallback
    const fallback =
        document.createElement("div");

    fallback.className =
        "webgl-fallback";

    fallback.textContent =
        "This experience requires WebGL support.";

    container.appendChild(fallback);

    return;
  }


  // ==========================================================================
  // 12. 创建 Three.js 场景与相机
  // ==========================================================================

  const scene =
      new THREE.Scene();


  // 创建透视相机
  //
  // 参数依次为：
  //
  // 35   -> 视野角 FOV
  // 1    -> 初始宽高比，之后 resize 时重新设置
  // 0.1  -> 近裁剪面
  // 100  -> 远裁剪面
  const camera =
      new THREE.PerspectiveCamera(
          35,
          1,
          0.1,
          100
      );


  // 相机放在 Z=8
  camera.position.set(
      0,
      0,
      8
  );

  // 相机看向世界坐标原点
  camera.lookAt(
      0,
      0,
      0
  );


  // ==========================================================================
  // 13. Renderer 配置
  // ==========================================================================

  // 使用 sRGB 输出颜色空间
  renderer.outputColorSpace =
      THREE.SRGBColorSpace;


  // 开启阴影
  renderer.shadowMap.enabled = true;


  // 使用软阴影
  renderer.shadowMap.type =
      THREE.PCFSoftShadowMap;


  // 限制 DPR 最大为 2
  //
  // 避免 Retina / 高 DPI 屏幕导致渲染分辨率过高，
  // 从而显著增加 GPU 开销。
  renderer.setPixelRatio(
      Math.min(
          window.devicePixelRatio,
          2
      )
  );


  // 将 Three.js 创建的 canvas 添加到 DOM
  container.appendChild(
      renderer.domElement
  );


  // ==========================================================================
  // 14. 场景灯光
  // ==========================================================================


  // --------------------------------------------------------------------------
  // 环境光
  // --------------------------------------------------------------------------
  //
  // 给所有方向提供基础亮度，
  // 防止卡片暗部完全变黑。
  //

  const ambientLight =
      new THREE.AmbientLight(
          0xffffff,
          1.5
      );

  scene.add(ambientLight);


  // --------------------------------------------------------------------------
  // 主方向光
  // --------------------------------------------------------------------------

  const keyLight =
      new THREE.DirectionalLight(
          0xffffff,
          2
      );


  // 光源位于右上前方
  keyLight.position.set(
      3,
      5,
      6
  );


  // 主光产生阴影
  keyLight.castShadow = true;


  // 阴影贴图分辨率
  keyLight.shadow.mapSize.set(
      1024,
      1024
  );


  scene.add(keyLight);


  // --------------------------------------------------------------------------
  // 补光
  // --------------------------------------------------------------------------
  //
  // 从左下方补充少量偏冷的光，
  // 减少阴影区域过暗的问题。
  //

  const fillLight =
      new THREE.DirectionalLight(
          0xdde7ff,
          0.65
      );


  fillLight.position.set(
      -4,
      -1,
      4
  );


  scene.add(fillLight);


  // ==========================================================================
  // 15. 创建卡片组
  // ==========================================================================

  const cardsGroup = new THREE.Group();


  // 初始时整个卡片组位于屏幕下方
  //
  // 入场动画会从：
  //
  // y = -1.5
  //
  // 移动到：
  //
  // y = 0
  cardsGroup.position.y = -1.5;


  scene.add(cardsGroup);


  // ==========================================================================
  // 16. 创建最前方黄色卡片
  // ==========================================================================

  const frontCard =
      createCard({

        background: "#f0fd00",

        foreground: "#0f0f0f",

        title: "FIRST FRAME",

        subtitle: "Start here",

        index: "00",

        icon: "chevron",

        // 比其他卡片更靠近相机
        z: 0.12,
      });


  // ==========================================================================
  // 17. 创建后方四张卡片
  // ==========================================================================

  // 卡片标题
  const labels = [
    "BREATHE",
    "MOVE",
    "NOTICE",
    "REST",
  ];


  // 卡片图标
  const icons = [
    "leaf",
    "footsteps",
    "eye",
    "moon",
  ];


  // 根据 labels 创建四张卡片
  const backCards =
      labels.map(
          (title, i) => {

            const card =
                createCard({

                  background:
                      cardColors[i],

                  foreground:
                      cardTextColors[i],

                  title,

                  subtitle: "",

                  // 将 1、2、3、4 转换成：
                  //
                  // 01
                  // 02
                  // 03
                  // 04
                  index:
                      String(i + 1)
                          .padStart(
                              2,
                              "0"
                          ),

                  icon:
                      icons[i],

                  z:
                  backCardPositions[i].z,
                });


            // 设置轻微的左右错位
            card.position.x =
                backCardPositions[i].x;


            // 初始时将卡片绕 Y 轴旋转 180°
            //
            // 也就是说初始看到的是卡片背面。
            card.rotation.y =
                -Math.PI;


            return card;
          }
      );


  // ==========================================================================
  // 18. 将卡片加入 cardsGroup
  // ==========================================================================

  cardsGroup.add(
      frontCard,
      ...backCards
  );


  // 保存所有需要在 destroy() 中释放资源的卡片
  const resourceCards = [
    frontCard,
    ...backCards,
  ];


  // ==========================================================================
  // 19. 页面尺寸与响应式缩放
  // ==========================================================================

  let width = 0;

  let height = 0;


  // --------------------------------------------------------------------------
  // 根据相机可视范围动态调整卡片大小
  // --------------------------------------------------------------------------

  function updateCardScale() {

    // 计算相机和卡片组之间的 Z 向距离
    const distance =
        Math.abs(
            camera.position.z -
            cardsGroup.position.z
        );


    // 根据透视相机 FOV 计算当前距离下
    // 相机能够看到的世界坐标高度。
    const visibleHeight =
        2 *
        Math.tan(
            THREE.MathUtils.degToRad(
                camera.fov / 2
            )
        ) *
        distance;


    // 根据相机宽高比得到可视宽度
    const visibleWidth =
        visibleHeight *
        camera.aspect;


    // 按照屏幕宽度计算允许的卡片缩放比例
    //
    // 卡片最多占可视宽度的约 82%。
    const widthScale =
        (visibleWidth * 0.82) /
        CARD_WIDTH;


    // 按照屏幕高度计算允许的卡片缩放比例
    //
    // 卡片最多占可视高度的约 78%。
    const heightScale =
        (visibleHeight * 0.78) /
        CARD_HEIGHT;


    // 最终缩放限制在：
    //
    // 最小 0.52
    // 最大 1.0
    const scale =
        clamp(
            0.52,
            1,
            Math.min(
                widthScale,
                heightScale,
                1
            )
        );


    // 整组卡片统一缩放
    cardsGroup.scale.setScalar(scale);
  }


  // --------------------------------------------------------------------------
  // 浏览器尺寸变化处理
  // --------------------------------------------------------------------------

  function handleResize() {

    // 优先使用 Three.js 容器尺寸
    width =
        container.clientWidth ||
        window.innerWidth;

    height =
        container.clientHeight ||
        window.innerHeight;


    // 更新相机宽高比
    camera.aspect =
        width / height;


    // 修改 FOV / aspect 后必须更新投影矩阵
    camera.updateProjectionMatrix();


    // 修改 Renderer Canvas 尺寸
    //
    // false 表示不要同时通过 style 强制修改 CSS 尺寸。
    renderer.setSize(
        width,
        height,
        false
    );


    // 页面尺寸变化时重新读取 DPR
    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio,
            2
        )
    );


    // 重新计算卡片缩放
    updateCardScale();
  }


  // 初始化尺寸
  handleResize();


  // 监听窗口尺寸改变
  window.addEventListener(
      "resize",
      handleResize,
      {
        passive: true,
      }
  );


  // ==========================================================================
  // 20. 翻牌动画状态
  // ==========================================================================

  // 是否已经执行过翻牌
  //
  // 用来避免 updateSequence() 每帧重复触发 revealBackCards()。
  let isFlipped = false;


  // 当前翻牌动画是否正在运行
  //
  // 后续控制 card.rotation.z 时需要判断，
  // 避免 updateSequence() 和 GSAP flipTimeline 同时修改旋转值。
  let isFlipAnimating = false;


  // 保存当前 GSAP 翻牌时间轴
  let flipTimeline = null;


  // 将逻辑单位 200 转换为总动画 progress
  const flipThreshold =
      unitToProgress(
          CARD_FLIP_TRIGGER
      );


  // 将逻辑单位 300 转换为总动画 progress
  const dismissThreshold =
      unitToProgress(
          CARD_DISMISS_START
      );


  // ==========================================================================
  // 21. 停止当前翻牌动画
  // ==========================================================================

  function killFlipTimeline() {

    if (flipTimeline) {

      // 停止 GSAP Timeline
      flipTimeline.kill();

      flipTimeline = null;
    }
  }


  // ==========================================================================
  // 22. 翻开前卡并展示后方四张卡片
  // ==========================================================================

  function revealBackCards() {

    // 避免存在旧的动画时间轴
    killFlipTimeline();


    // 标记翻牌动画正在执行
    isFlipAnimating = true;


    // 创建翻牌 Timeline
    flipTimeline =
        gsap.timeline({

          // Timeline 中所有动画默认参数
          defaults: {

            // 每个动画持续 1 秒
            duration: 1,

            // 使用弹性缓动
            ease:
                "elastic.out(1, 0.5)",
          },


          // 整个翻牌 Timeline 完成
          onComplete: () => {

            isFlipAnimating = false;
          },
        });


    // ------------------------------------------------------------------------
    // 前方黄色卡片
    // ------------------------------------------------------------------------

    flipTimeline.to(
        frontCard.rotation,
        {
          y: Math.PI,
        },
        0
    );


    flipTimeline.call(
        () => {

          // frontCard.visible = false;
          frontCard.position.z = -1;

        },
        [],
        0
    );


    // ------------------------------------------------------------------------
    // 后方四张卡片
    // ------------------------------------------------------------------------

    backCards.forEach(
        (card, i) => {

          // 所有后方卡片同时开始翻转
          flipTimeline.to(
              card.rotation,
              {

                // 从 -180° 转到 0°
                //
                // 即从背面翻到正面。
                y: 0,

                // 同时绕 Z 轴形成不同倾角，
                // 组成扇形排布。
                z:
                    degToRad(
                        cardFlipTiltAngles[i]
                    ),
              },

              // 第三个参数 = 0
              //
              // 表示四张卡片全部从 Timeline 0 秒开始，
              // 即同时翻转，而不是依次翻转。
              0
          );
        }
    );
  }


  // ==========================================================================
  // 23. 自动播放状态对象
  // ==========================================================================

  // 使用对象而不是普通 number，
  // 是因为 GSAP 可以直接 tween 对象属性。
  const playback = {
    progress: 0,
  };


  // ==========================================================================
  // 24. 根据 progress 更新整个动画场景
  // ==========================================================================
//
// progress 范围：
//
// 0.0 ---------------------------- 1.0
//
// 它对应前面定义的：
//
// 0 ----------------------------- 700
//
// updateSequence() 本身主要负责：
//
// 1. 卡片入场
// 2. Hero 标题退出
// 3. 自动播放提示淡出
// 4. 到达阈值后触发翻牌
// 5. 四张卡片依次抽离
//

  function updateSequence(progress) {

    // ========================================================================
    // 24.1 入场动画
    // ========================================================================
    //
    // 原逻辑：
    //
    // 0 ~ 100
    //
    // 转换成：
    //
    // enterProgress = 0 ~ 1
    //

    const enterProgress =
        clamp(
            0,
            1,

            mapRange(
                0,

                unitToProgress(
                    CARDS_ENTER_END
                ),

                0,
                1,

                progress
            )
        );


    // ------------------------------------------------------------------------
    // 卡片组向上进入屏幕中央
    // ------------------------------------------------------------------------
    //
    // enterProgress = 0
    // y = -1.5
    //
    // enterProgress = 1
    // y = 0
    //

    cardsGroup.position.y =
        mapRange(
            0,
            1,
            -1.5,
            0,
            enterProgress
        );


    // ------------------------------------------------------------------------
    // Hero 标题向上退出
    // ------------------------------------------------------------------------
    //
    // yPercent:
    //
    // 0   -> 原位置
    // -100 -> 向上移动自身高度的 100%
    //

    gsap.set(
        heroHeadline,
        {
          yPercent:
              mapRange(
                  0,
                  1,
                  0,
                  -100,
                  enterProgress
              ),
        }
    );

    // ========================================================================
    // 24.2 到达翻牌阈值后触发翻牌
    // ========================================================================

    if (
        progress > flipThreshold &&
        !isFlipped
    ) {

      // 执行翻牌动画
      revealBackCards();

      // 防止下一帧再次触发
      isFlipped = true;
    }


    // ========================================================================
    // 24.3 四张后方卡片逐张抽离
    // ========================================================================

    backCards.forEach(
        (card, i) => {

          // ------------------------------------------------------------------
          // 决定当前卡片的抽离顺序
          // ------------------------------------------------------------------
          //
          // backCards 数组本身：
          //
          // i=0 -> 最上层
          // i=1 -> 第二层
          // i=2 -> 第三层
          // i=3 -> 最下层
          //
          // 因此：
          //
          // dismissOrder = i
          //
          // 就意味着：
          //
          // 第1张 -> 第2张 -> 第3张 -> 第4张
          //
          // 依次被抽走。
          //

          const dismissOrder = i;


          // ------------------------------------------------------------------
          // 当前卡片抽离开始时间
          // ------------------------------------------------------------------
          //
          // i = 0:
          // 300
          //
          // i = 1:
          // 400
          //
          // i = 2:
          // 500
          //
          // i = 3:
          // 600
          //

          const dismissStart =
              unitToProgress(
                  CARD_DISMISS_START +
                  dismissOrder *
                  CARD_DISMISS_DURATION
              );


          // ------------------------------------------------------------------
          // 当前卡片抽离结束时间
          // ------------------------------------------------------------------
          //
          // i = 0:
          // 400
          //
          // i = 1:
          // 500
          //
          // i = 2:
          // 600
          //
          // i = 3:
          // 700
          //

          const dismissEnd =
              unitToProgress(
                  CARD_DISMISS_START +
                  (dismissOrder + 1) *
                  CARD_DISMISS_DURATION
              );


          // ------------------------------------------------------------------
          // 翻牌之前不进行抽离
          // ------------------------------------------------------------------

          if (
              progress <=
              flipThreshold
          ) {

            // 恢复卡片 Y 位置
            card.position.y = 0;


            // 恢复卡片 X 位置
            card.position.x =
                backCardPositions[i].x;


            // 当前卡片后续代码不再执行
            return;
          }


          // ------------------------------------------------------------------
          // 计算当前卡片自己的抽离进度
          // ------------------------------------------------------------------
          //
          // 当 progress < dismissStart：
          //
          // dismissProgress = 0
          //
          // 当 progress > dismissEnd：
          //
          // dismissProgress = 1
          //
          // 在两者之间：
          //
          // dismissProgress = 0~1
          //

          const dismissProgress =
              clamp(
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


          // ------------------------------------------------------------------
          // 卡片向上飞出
          // ------------------------------------------------------------------
          //
          // y:
          //
          // 0 -> 4.5
          //

          card.position.y =
              THREE.MathUtils.lerp(
                  0,
                  4.5,
                  dismissProgress
              );


          // ------------------------------------------------------------------
          // 卡片向左右轻微甩出
          // ------------------------------------------------------------------
          //
          // 偶数卡片向左：
          //
          // i=0
          // i=2
          //
          // 奇数卡片向右：
          //
          // i=1
          // i=3
          //

          card.position.x =
              THREE.MathUtils.lerp(

                  // 初始 X
                  backCardPositions[i].x,

                  // 最终 X
                  backCardPositions[i].x +
                  (
                      i % 2 === 0
                          ? -0.24
                          : 0.24
                  ),

                  dismissProgress
              );


          // ------------------------------------------------------------------
          // 卡片抽离时加大 Z 轴旋转
          // ------------------------------------------------------------------

          if (
              dismissProgress > 0 ||
              (
                  !isFlipAnimating &&
                  progress >=
                  dismissThreshold
              )
          ) {

            card.rotation.z =
                THREE.MathUtils.lerp(

                    // 翻牌结束后的扇形角度
                    degToRad(
                        cardFlipTiltAngles[i]
                    ),

                    // 飞出时最终角度
                    degToRad(
                        cardDismissTiltAngles[i]
                    ),

                    dismissProgress
                );

          } else if (
              !isFlipAnimating
          ) {

            // 如果翻牌动画已经结束，
            // 但当前卡片还没开始抽离，
            // 固定保持扇形倾角。
            card.rotation.z =
                degToRad(
                    cardFlipTiltAngles[i]
                );
          }
        }
    );
  }


  // ==========================================================================
  // 25. 将动画恢复到初始状态
  // ==========================================================================

  function resetSequence() {

    // 停止可能还存在的翻牌动画
    killFlipTimeline();


    // 重置翻牌状态
    isFlipped = false;

    isFlipAnimating = false;


    // ------------------------------------------------------------------------
    // 恢复黄色前卡
    // ------------------------------------------------------------------------

    frontCard.visible = true;


    // rotation.set(x, y, z)
    //
    // 恢复为完全正对相机
    frontCard.rotation.set(
        0,
        0,
        0
    );


    // ------------------------------------------------------------------------
    // 恢复四张后方卡片
    // ------------------------------------------------------------------------

    backCards.forEach(
        (card, i) => {

          // 确保卡片可见
          card.visible = true;


          // 恢复初始位置
          card.position.set(

              backCardPositions[i].x,

              0,

              backCardPositions[i].z
          );


          // 恢复初始旋转
          //
          // Y = -π
          //
          // 即背面对着相机。
          card.rotation.set(
              0,
              -Math.PI,
              0
          );
        }
    );


    // 重置动画总进度
    playback.progress = 0;


    // 根据 progress=0
    // 同步恢复 Hero、卡片组等其他状态。
    updateSequence(0);
  }


  // 初始化时先恢复一次场景
  resetSequence();


  // ==========================================================================
  // 26. 自动播放 GSAP Timeline
  // ==========================================================================

  const autoplayTimeline =
      gsap.timeline({

        // 无限重复
        repeat: -1,

        // 每次播放结束后等待 1.5 秒
        repeatDelay:
        AUTOPLAY_REPEAT_DELAY,

        // 新一轮动画开始时重置所有状态
        onRepeat:
        resetSequence,
      })


          // ----------------------------------------------------------------------
          // 将 playback.progress 从 0 动画到 1
          // ----------------------------------------------------------------------

          .to(
              playback,
              {

                progress: 1,

                // 整个动画持续 14 秒
                duration:
                AUTOPLAY_DURATION,

                // 总进度必须线性变化
                //
                // 每个局部动画自己的速度，
                // 已经由逻辑时间单位决定。
                ease: "none",

                // 每一帧根据最新 progress
                // 更新 Three.js 场景。
                onUpdate: () =>
                    updateSequence(
                        playback.progress
                    ),
              }
          );


  // ==========================================================================
  // 27. 页面不可见时暂停动画
  // ==========================================================================
//
// 当用户切换到其他浏览器标签页时：
//
// document.hidden = true
//
// 此时暂停 GSAP 动画，可以减少：
//
// CPU 使用
// GPU 使用
// 电量消耗
//

  const handleVisibilityChange =
      () => {

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
  // 28. Three.js 渲染循环
  // ==========================================================================

  // 保存 requestAnimationFrame 返回的 ID，
  // destroy() 时用于取消动画。
  let frameId = 0;


  // 标记当前场景是否已经被销毁
  let destroyed = false;


  function render() {

    // 如果资源已经销毁，
    // 不允许继续访问 Renderer。
    if (destroyed) {
      return;
    }


    // 将当前 Scene
    // 使用当前 Camera
    // 渲染到 Canvas。
    renderer.render(
        scene,
        camera
    );


    // 请求浏览器下一帧继续调用 render()
    frameId =
        requestAnimationFrame(
            render
        );
  }


  // 启动渲染循环
  render();


  // ==========================================================================
  // 29. 销毁 Three.js 场景
  // ==========================================================================
//
// 这部分对于 Three.js 项目非常重要。
//
// 单纯删除 DOM 或 JS 引用，
// 并不会自动释放所有 WebGL GPU 资源。
//
// 因此必须主动 dispose：
//
// Geometry
// Material
// Texture
// Renderer
//

  function destroy() {

    // 防止重复销毁
    if (destroyed) {
      return;
    }


    destroyed = true;


    // ------------------------------------------------------------------------
    // 停止 requestAnimationFrame
    // ------------------------------------------------------------------------

    cancelAnimationFrame(
        frameId
    );


    // ------------------------------------------------------------------------
    // 停止 GSAP 动画
    // ------------------------------------------------------------------------

    killFlipTimeline();

    autoplayTimeline.kill();


    // ------------------------------------------------------------------------
    // 移除事件监听
    // ------------------------------------------------------------------------

    document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
    );


    window.removeEventListener(
        "resize",
        handleResize
    );


    // ------------------------------------------------------------------------
    // 释放每张卡片的 Three.js GPU 资源
    // ------------------------------------------------------------------------

    resourceCards.forEach(
        (card) => {

          // createCard() 时已经将这些资源保存进 userData
          const {
            geometry,
            materials,
            textures,
          } =
              card.userData.resources;


          // 释放几何体顶点缓冲区
          geometry.dispose();


          // 释放全部材质
          materials.forEach(
              (material) =>
                  material.dispose()
          );


          // 释放正面 / 背面纹理
          textures.forEach(
              (texture) =>
                  texture.dispose()
          );
        }
    );


    // ------------------------------------------------------------------------
    // 释放 Renderer
    // ------------------------------------------------------------------------

    renderer.dispose();


    // ------------------------------------------------------------------------
    // 删除 Canvas DOM
    // ------------------------------------------------------------------------

    renderer.domElement.remove();
  }


  // ==========================================================================
  // 30. 页面关闭前自动销毁
  // ==========================================================================

  window.addEventListener(
      "beforeunload",
      destroy,
      {
        // 只触发一次
        once: true,
      }
  );


  // ==========================================================================
  // 31. Vite HMR 热更新清理
  // ==========================================================================
//
// 开发环境中修改 JS 文件以后，
// Vite 通常不会完整刷新整个浏览器页面，
// 而是使用 HMR 替换模块。
//
// 如果旧模块中的 Three.js Renderer / RAF / GSAP
// 没有销毁，就可能造成：
//
// - 多个 render() 循环同时存在
// - 多个 Canvas 重叠
// - 多个 GSAP Timeline 同时运行
// - GPU 内存泄漏
//
// 因此在模块被替换之前调用 destroy()。
//

  if (import.meta.hot) {

    import.meta.hot.dispose(
        destroy
    );
  }


  // 返回 destroy，
  // 如果以后外部需要手动销毁场景，也可以调用它。
  return destroy;
}


// ============================================================================
// 32. 等待字体加载完成以后再初始化
// ============================================================================
//
// 卡片上的文字并不是 DOM 文本，
// 而是在 createCardTexture() 中直接画入 Canvas。
//
// Canvas 一旦执行：
//
// ctx.fillText()
//
// 它就会把当时实际可用的字体直接绘制进像素。
//
// 如果 Barlow Condensed / DM Sans 尚未加载完成，
// 浏览器可能会先使用 fallback font。
//
// 即使 Web Font 后面加载成功，
// 已经生成的 CanvasTexture 也不会自动重新绘制。
//
// 因此这里优先等待：
//
// document.fonts.ready
//
// 保证字体加载完成后再生成卡片纹理。
//

if (document.fonts?.ready) {

  document.fonts.ready.then(
      init
  );

} else {

  // 某些旧浏览器没有 document.fonts，
  // 直接初始化。
  init();
}
