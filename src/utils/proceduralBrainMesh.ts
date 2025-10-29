import * as THREE from 'three';

const VERTEX_ROWS = 125;
const VERTEX_COLS = 400;
export const PROCEDURAL_BRAIN_VERTEX_COUNT = VERTEX_ROWS * VERTEX_COLS; // 50,000 vertices
export const PROCEDURAL_BRAIN_FACE_COUNT = 50000; // target face count

const EXTRA_TRIANGLES = PROCEDURAL_BRAIN_FACE_COUNT - (VERTEX_ROWS - 1) * (VERTEX_COLS - 1); // 524

const clamp01 = (value: number) => THREE.MathUtils.clamp(value, 0, 1);

export const createProceduralBrainMesh = (activityLevel = 0): THREE.Mesh => {
  const totalVertices = PROCEDURAL_BRAIN_VERTEX_COUNT;
  const positions = new Float32Array(totalVertices * 3);
  const colors = new Float32Array(totalVertices * 3);
  const indices = new Uint32Array(PROCEDURAL_BRAIN_FACE_COUNT * 3);

  const color = new THREE.Color();

  for (let row = 0; row < VERTEX_ROWS; row++) {
    for (let col = 0; col < VERTEX_COLS; col++) {
      const vertexIndex = row * VERTEX_COLS + col;
      const offset = vertexIndex * 3;

      const u = col / (VERTEX_COLS - 1); // horizontal 0..1
      const v = row / (VERTEX_ROWS - 1); // vertical 0..1

      const theta = v * Math.PI; // polar angle
      const phi = u * Math.PI * 2; // azimuthal angle

      const hemisphereBlend = Math.tanh(Math.cos(phi) * 2);
      const corticalFold = 0.12 * Math.sin(8 * phi + theta * 5);
      const verticalFold = 0.08 * Math.sin(6 * theta + phi * 3);
      const lobeShift = 0.18 * hemisphereBlend * Math.pow(Math.sin(theta), 2);

      const radiusBase = 42 + 5 * Math.sin(theta) * Math.sin(theta) + 4 * hemisphereBlend;
      const radius =
        radiusBase * (1 + 0.18 * activityLevel) +
        4 * corticalFold +
        3 * verticalFold;

      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const x =
        radius *
        sinTheta *
        cosPhi *
        (1 + 0.06 * hemisphereBlend) +
        lobeShift * 18;
      const y =
        radius * cosTheta * 0.85 +
        6 * Math.sin(phi * 4) * Math.pow(sinTheta, 2);
      const z =
        radius *
        sinTheta *
        sinPhi *
        (1 - 0.05 * hemisphereBlend) +
        hemisphereBlend * 6;

      positions[offset + 0] = x;
      positions[offset + 1] = y;
      positions[offset + 2] = z;

      const heightNorm = clamp01((y + 50) / 100);
      const foldStrength = clamp01((corticalFold + verticalFold + 0.2) * 0.6);

      const hue = clamp01(0.03 + 0.08 * activityLevel - 0.25 * heightNorm);
      const saturation = clamp01(0.55 + 0.25 * foldStrength + 0.15 * activityLevel);
      const lightness = clamp01(0.58 + 0.12 * activityLevel - 0.18 * heightNorm);

      color.setHSL(hue, saturation, lightness);
      colors[offset + 0] = color.r;
      colors[offset + 1] = color.g;
      colors[offset + 2] = color.b;
    }
  }

  let indexOffset = 0;
  let extrasUsed = 0;

  for (let row = 0; row < VERTEX_ROWS - 1; row++) {
    for (let col = 0; col < VERTEX_COLS - 1; col++) {
      const topLeft = row * VERTEX_COLS + col;
      const bottomLeft = (row + 1) * VERTEX_COLS + col;
      const topRight = row * VERTEX_COLS + col + 1;
      const bottomRight = (row + 1) * VERTEX_COLS + col + 1;

      indices[indexOffset++] = topLeft;
      indices[indexOffset++] = bottomLeft;
      indices[indexOffset++] = topRight;

      if (extrasUsed < EXTRA_TRIANGLES) {
        indices[indexOffset++] = bottomLeft;
        indices[indexOffset++] = bottomRight;
        indices[indexOffset++] = topRight;
        extrasUsed++;
      }
    }
  }

  if (indexOffset !== PROCEDURAL_BRAIN_FACE_COUNT * 3) {
    console.warn('🧠 Procedural brain index generation mismatch:', indexOffset);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  const boundingBox = geometry.boundingBox;
  if (boundingBox) {
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.computeBoundingBox();
  }

  geometry.computeBoundingSphere();

  const material = new THREE.MeshPhongMaterial({
    vertexColors: true,
    shininess: 40,
    specular: new THREE.Color(0x444444),
    side: THREE.FrontSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'ProceduralBrainMesh';
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  return mesh;
};
