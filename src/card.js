import * as THREE from "three";

export const CARD_HEIGHT = 3.4;
export const DEFAULT_CARD_ASPECT_RATIO = 4 / 5;
const CARD_DEPTH = 0.06;

const textureLoader = new THREE.TextureLoader();

function loadCardTexture(source, label, onLoad) {
  if (!source) throw new Error(`${label} image source is required.`);

  const texture = textureLoader.load(
    source,
    (loadedTexture) => {
      loadedTexture.colorSpace = THREE.SRGBColorSpace;
      loadedTexture.anisotropy = 8;
      loadedTexture.needsUpdate = true;
      onLoad?.(loadedTexture);
    },
    undefined,
    (error) => console.error(`Unable to load ${label} image: ${source}`, error),
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates a physical card whose artwork comes from image resources. Both values
 * accept URLs produced by an ES module import as well as regular local/remote URLs.
 */
export function createCard({ frontImage, backImage, sideColor = "#d8d8d8", z = 0, onResize }) {
  const initialWidth = CARD_HEIGHT * DEFAULT_CARD_ASPECT_RATIO;
  const geometry = new THREE.BoxGeometry(initialWidth, CARD_HEIGHT, CARD_DEPTH, 2, 2, 1);
  let mesh;
  const frontTexture = loadCardTexture(frontImage, "front card", (loadedTexture) => {
    const { width, height } = loadedTexture.image ?? {};
    if (!width || !height) return;

    const cardWidth = CARD_HEIGHT * (width / height);
    if (Math.abs(cardWidth - mesh.userData.cardWidth) < Number.EPSILON) return;

    const resizedGeometry = new THREE.BoxGeometry(cardWidth, CARD_HEIGHT, CARD_DEPTH, 2, 2, 1);
    mesh.geometry.dispose();
    mesh.geometry = resizedGeometry;
    mesh.userData.cardWidth = cardWidth;
    mesh.userData.resources.geometry = resizedGeometry;
    onResize?.(mesh);
  });
  const backTexture = loadCardTexture(backImage, "back card");
  const edgeColor = new THREE.Color(sideColor).multiplyScalar(0.82);
  const sideMaterials = Array.from({ length: 4 }, () => new THREE.MeshStandardMaterial({
    color: edgeColor,
    roughness: 0.78,
    metalness: 0,
  }));
  const materials = [
    ...sideMaterials,
    new THREE.MeshPhysicalMaterial({ map: frontTexture, roughness: 0.72, metalness: 0, clearcoat: 0.08, clearcoatRoughness: 0.65 }),
    new THREE.MeshPhysicalMaterial({ map: backTexture, roughness: 0.78, metalness: 0, clearcoat: 0.05 }),
  ];
  mesh = new THREE.Mesh(geometry, materials);
  mesh.userData.cardWidth = initialWidth;
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
