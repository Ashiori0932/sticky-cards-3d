import * as THREE from "three";

// Angles circle the focal card without using mirrored pairs. Keeping this list
// deterministic gives every replay the same balanced composition.
const LINE_LAYOUT = [
  { angle: -168, inner: 0.78, width: 0.105, color: 0x111111, delay: 0.018 },
  { angle: -151, inner: 0.9, width: 0.046, color: 0xffffff, delay: 0.052 },
  { angle: -135, inner: 0.72, width: 0.075, color: 0x111111, delay: 0 },
  { angle: -116, inner: 0.91, width: 0.038, color: 0xffffff, delay: 0.068 },
  { angle: -97, inner: 0.82, width: 0.06, color: 0x111111, delay: 0.036 },
  { angle: -73, inner: 0.9, width: 0.04, color: 0x111111, delay: 0.058 },
  { angle: -51, inner: 0.74, width: 0.09, color: 0xffffff, delay: 0.012 },
  { angle: -27, inner: 0.86, width: 0.052, color: 0x111111, delay: 0.044 },
  { angle: -9, inner: 0.77, width: 0.11, color: 0x111111, delay: 0.006 },
  { angle: 16, inner: 0.91, width: 0.042, color: 0xffffff, delay: 0.064 },
  { angle: 37, inner: 0.75, width: 0.082, color: 0x111111, delay: 0.024 },
  { angle: 58, inner: 0.88, width: 0.048, color: 0xffffff, delay: 0.056 },
  { angle: 79, inner: 0.81, width: 0.065, color: 0x111111, delay: 0.03 },
  { angle: 103, inner: 0.92, width: 0.04, color: 0xffffff, delay: 0.072 },
  { angle: 126, inner: 0.73, width: 0.095, color: 0x111111, delay: 0.01 },
  { angle: 149, inner: 0.86, width: 0.05, color: 0xffffff, delay: 0.048 },
];

const OVERLAY_DISTANCE = 1;
const degToRad = THREE.MathUtils.degToRad;

function createWedgeGeometry(tipWidth = 0.1) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -tipWidth / 2);
  shape.lineTo(1, -0.5);
  shape.lineTo(1, 0.5);
  shape.lineTo(0, tipWidth / 2);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function createMaterial(color) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function createImpactLine(config, index) {
  const line = new THREE.Group();
  const outlineGeometry = createWedgeGeometry();
  const outlineMaterial = createMaterial(0x111111);
  const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
  outline.renderOrder = 20;
  line.add(outline);

  const resources = [{ geometry: outlineGeometry, material: outlineMaterial }];
  if (config.color === 0xffffff) {
    const fillGeometry = createWedgeGeometry(0.06);
    const fillMaterial = createMaterial(0xffffff);
    const fill = new THREE.Mesh(fillGeometry, fillMaterial);
    fill.position.z = 0.002;
    fill.scale.set(0.96, 0.58, 1);
    fill.renderOrder = 21;
    line.add(fill);
    resources.push({ geometry: fillGeometry, material: fillMaterial });
  }

  line.rotation.z = degToRad(config.angle);
  line.userData = {
    angle: line.rotation.z,
    inner: config.inner,
    width: config.width,
    delay: config.delay,
    length: 1,
    resources,
    materials: resources.map(({ material }) => material),
    index,
  };
  return line;
}

export function createImpactLines() {
  const group = new THREE.Group();
  group.name = "camera-impact-lines";
  group.visible = false;
  group.frustumCulled = false;
  LINE_LAYOUT.forEach((config, index) => group.add(createImpactLine(config, index)));
  return group;
}

export function resizeImpactLines(group, camera, width, height) {
  const aspect = width / Math.max(height, 1);
  const halfHeight = Math.tan(degToRad(camera.fov / 2)) * OVERLAY_DISTANCE;
  group.scale.setScalar(halfHeight);

  group.children.forEach((line) => {
    const { angle, inner, width: lineWidth } = line.userData;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const edgeRadius = Math.min(
      Math.abs(cos) < 0.001 ? Infinity : aspect / Math.abs(cos),
      Math.abs(sin) < 0.001 ? Infinity : 1 / Math.abs(sin),
    );
    const length = edgeRadius * 1.22 - inner;
    line.userData.length = length;
    line.userData.startX = cos * inner;
    line.userData.startY = sin * inner;
    line.position.set(line.userData.startX, line.userData.startY, 0);
    line.scale.set(length, lineWidth, 1);
  });
}

// The group remains a direct child of the scene; only its world position follows
// the camera so the effect behaves like a screen-space layer during the push-in.
export function syncImpactLinesToCamera(group, camera) {
  group.position.set(camera.position.x, camera.position.y, camera.position.z - OVERLAY_DISTANCE);
  group.quaternion.copy(camera.quaternion);
}

export function disposeImpactLines(group) {
  group.children.forEach((line) => {
    line.userData.resources.forEach(({ geometry, material }) => {
      geometry.dispose();
      material.dispose();
    });
  });
}
