import * as THREE from "three";

const LINE_LAYOUT = [
  { length: 1.22, width: 0.15, x: 2.12, y: 1.18, angle: -0.42, color: 0x111111 },
  { length: 0.92, width: 0.11, x: 2.34, y: 0.42, angle: -0.14, color: 0xffffff },
  { length: 1.08, width: 0.18, x: 2.28, y: -0.48, angle: 0.18, color: 0x111111 },
  { length: 0.76, width: 0.1, x: 2.02, y: -1.18, angle: 0.4, color: 0xffffff },
];

function createWedgeGeometry(length, width, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(-length / 2, -width / 2);
  shape.lineTo(length / 2, -width * 0.16);
  shape.lineTo(length / 2, width * 0.16);
  shape.lineTo(-length / 2, width / 2);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.center();
  return geometry;
}

function createImpactLine(config, side) {
  const group = new THREE.Group();
  const outlineGeometry = createWedgeGeometry(config.length, config.width, 0.055);
  const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 });
  group.add(new THREE.Mesh(outlineGeometry, outlineMaterial));

  const resources = [{ geometry: outlineGeometry, material: outlineMaterial }];
  if (config.color === 0xffffff) {
    const fillGeometry = createWedgeGeometry(config.length * 0.91, config.width * 0.58, 0.065);
    const fillMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    group.add(new THREE.Mesh(fillGeometry, fillMaterial));
    resources.push({ geometry: fillGeometry, material: fillMaterial });
  }

  group.position.set(side * config.x, config.y, 0.16);
  group.rotation.z = side === 1 ? config.angle : Math.PI - config.angle;
  group.userData.finalZ = group.position.z;
  group.userData.resources = resources;
  return group;
}

export function createImpactLines() {
  const group = new THREE.Group();
  group.name = "final-card-impact-lines";
  for (const side of [-1, 1]) {
    LINE_LAYOUT.forEach((config) => group.add(createImpactLine(config, side)));
  }
  group.visible = false;
  return group;
}

export function disposeImpactLines(group) {
  group.children.forEach((line) => {
    line.userData.resources.forEach(({ geometry, material }) => {
      geometry.dispose();
      material.dispose();
    });
  });
}
