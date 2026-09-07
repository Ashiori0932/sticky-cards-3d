import * as THREE from "three";

export const CARD_WIDTH = 3;
export const CARD_HEIGHT = 3.75;
const CARD_DEPTH = 0.06;

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
    ctx.bezierCurveTo(-size * 0.1, -size * 0.45, size * 0.42, -size * 0.42, size * 0.32, size * 0.08);
    ctx.bezierCurveTo(size * 0.2, size * 0.45, -size * 0.12, size * 0.38, -size * 0.32, size * 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.28, size * 0.22);
    ctx.lineTo(size * 0.22, -size * 0.22);
    ctx.stroke();
  }

  if (type === "footsteps") {
    const foot = (offsetX, offsetY, rotation) => {
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.rotate(rotation);
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.13, size * 0.24, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(size * 0.02, -size * 0.28, size * 0.05, 0, Math.PI * 2);
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
    ctx.arc(0, 0, size * 0.32, Math.PI * 0.25, Math.PI * 1.75, false);
    ctx.bezierCurveTo(-size * 0.02, size * 0.14, size * 0.08, -size * 0.18, size * 0.23, -size * 0.24);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function createCardTexture({ background, foreground, title, subtitle, index, icon, back = false }) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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
    ctx.fillText("TURN THE CARD · FOLLOW THE MOTION", 512, 674);
  } else {
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
    ctx.font = '900 166px "Barlow Condensed", sans-serif';
    ctx.fillText(title, 92, 272);
    if (subtitle) {
      ctx.font = '500 34px "DM Sans", sans-serif';
      ctx.fillText(subtitle, 98, 332);
    }
    if (index) {
      ctx.font = '600 38px "DM Sans", sans-serif';
      ctx.textAlign = "right";
      ctx.fillText(index, 930, 104);
    }
    ctx.strokeStyle = foreground;
    ctx.globalAlpha = 0.34;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(94, 392);
    ctx.lineTo(930, 392);
    ctx.stroke();
    ctx.globalAlpha = 1;
    drawIcon(ctx, icon, 512, 760, 320, foreground);
    ctx.strokeStyle = foreground;
    ctx.globalAlpha = 0.24;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = '600 25px "DM Sans", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("AUTOPLAY / THREE.JS", 512, 1167);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

export function createCard({ background, foreground, title, subtitle, index, icon, z = 0 }) {
  const geometry = new THREE.BoxGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_DEPTH, 2, 2, 1);
  const frontTexture = createCardTexture({ background, foreground, title, subtitle, index, icon });
  const backTexture = createCardTexture({ background, foreground, title, subtitle, index, icon, back: true });
  const sideColor = new THREE.Color(background).multiplyScalar(0.82);
  const sideMaterials = Array.from({ length: 4 }, () => new THREE.MeshStandardMaterial({
    color: sideColor,
    roughness: 0.78,
    metalness: 0,
  }));
  const materials = [
    ...sideMaterials,
    new THREE.MeshPhysicalMaterial({ map: frontTexture, roughness: 0.72, metalness: 0, clearcoat: 0.08, clearcoatRoughness: 0.65 }),
    new THREE.MeshPhysicalMaterial({ map: backTexture, roughness: 0.78, metalness: 0, clearcoat: 0.05 }),
  ];
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.position.z = z;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.resources = { geometry, materials, textures: [frontTexture, backTexture] };
  return mesh;
}

export function disposeCard(card) {
  const { geometry, materials, textures } = card.userData.resources;
  geometry.dispose();
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}
