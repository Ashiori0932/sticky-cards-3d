import * as THREE from "three";

const LINE_LAYOUT = [
  { length: 1.22, width: 0.15, x: 2.12, y: 1.18, angle: -0.42, zRise: 1.45 },
  { length: 0.92, width: 0.11, x: 2.34, y: 0.42, angle: -0.14, zRise: 1.8 },
  { length: 1.08, width: 0.18, x: 2.28, y: -0.48, angle: 0.18, zRise: 1.65 },
  { length: 0.76, width: 0.1, x: 2.02, y: -1.18, angle: 0.4, zRise: 1.2 },
];

function createWedgeGeometry(length, width, thickness, zRise) {
  const innerX = -length / 2;
  const outerX = length / 2;
  const innerZ = -zRise / 2;
  const outerZ = zRise / 2;
  const vertices = new Float32Array([
    innerX, -width * 0.16, innerZ - thickness / 2,
    innerX, width * 0.16, innerZ - thickness / 2,
    outerX, width / 2, outerZ - thickness / 2,
    outerX, -width / 2, outerZ - thickness / 2,
    innerX, -width * 0.16, innerZ + thickness / 2,
    innerX, width * 0.16, innerZ + thickness / 2,
    outerX, width / 2, outerZ + thickness / 2,
    outerX, -width / 2, outerZ + thickness / 2,
  ]);
  const indices = [
    0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6,
    0, 4, 5, 0, 5, 1, 3, 2, 6, 3, 6, 7,
    1, 5, 6, 1, 6, 2, 0, 3, 7, 0, 7, 4,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createImpactLine(config, side) {
  const group = new THREE.Group();
  const outlineGeometry = createWedgeGeometry(config.length, config.width, 0.055, config.zRise);
  const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 });
  group.add(new THREE.Mesh(outlineGeometry, outlineMaterial));

  const resources = [{ geometry: outlineGeometry, material: outlineMaterial }];
  const fillGeometry = createWedgeGeometry(
    config.length * 0.91,
    config.width * 0.58,
    0.065,
    config.zRise * 0.91,
  );
  const fillMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const fill = new THREE.Mesh(fillGeometry, fillMaterial);
  fill.position.z = 0.04;
  group.add(fill);
  resources.push({ geometry: fillGeometry, material: fillMaterial });

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
