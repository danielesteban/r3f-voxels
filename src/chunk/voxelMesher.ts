import { Box3, Vector3 } from 'three';
import { ChunkData, chunkSize, VoxelFace } from '../data/Data';

const auxBox = new Box3();
const auxVectorA = new Vector3();
const auxVectorB = new Vector3();
const auxVectorC = new Vector3();
const map = new Uint8Array(chunkSize * chunkSize * chunkSize);
const normals = [
  [new Vector3(0, 0, 1), new Vector3(1, 0, 0), new Vector3(0, 1, 0)],
  [new Vector3(0, 1, 0), new Vector3(1, 0, 0), new Vector3(0, 0, -1)],
  [new Vector3(0, -1, 0), new Vector3(1, 0, 0), new Vector3(0, 0, 1)],
  [new Vector3(-1, 0, 0), new Vector3(0, 0, 1), new Vector3(0, 1, 0)],
  [new Vector3(1, 0, 0), new Vector3(0, 0, -1), new Vector3(0, 1, 0)],
  [new Vector3(0, 0, -1), new Vector3(-1, 0, 0), new Vector3(0, 1, 0)],
];

const vertices = [
  new Vector3(-1, 1, 0),
  new Vector3(1, 1, 0),
  new Vector3(-1, -1, 0),
  new Vector3(1, -1, 0),
];

const getAO = (n1: boolean, n2: boolean, n3: boolean) => {
  let ao = 0;
  if (n1) ao += 0.2;
  if (n2) ao += 0.2;
  if ((!n1 || !n2) && n3) ao += 0.2;
  return ao;
};

const getVoxel = (
  chunks: ChunkData[],
  x: number,
  y: number,
  z: number
) => {
  let cx = 1;
  let cy = 1;
  let cz = 1;
  if (x < 0) {
    x += chunkSize;
    cx -= 1;
  }
  if (x >= chunkSize) {
    x -= chunkSize;
    cx += 1;
  }
  if (y < 0) {
    y += chunkSize;
    cy -= 1;
  }
  if (y >= chunkSize) {
    y -= chunkSize;
    cy += 1;
  }
  if (z < 0) {
    z += chunkSize;
    cz -= 1;
  }
  if (z >= chunkSize) {
    z -= chunkSize;
    cz += 1;
  }
  return chunks[cz * 3 * 3 + cy * 3 + cx].voxels[z * chunkSize * chunkSize + y * chunkSize + x];
};

export const voxelMesher = (
  chunks: ChunkData[],
  getTexture: (voxel: number, face: VoxelFace, isTop: boolean) => number
) => {
  const bounds = auxBox.makeEmpty();
  const faces: number[] = [];

  let offset = 0;
  for (let z = 0; z < chunkSize; z++) {
    for (let y = 0; y < chunkSize; y++) {
      for (let x = 0; x < chunkSize; x++) {
        const voxel = getVoxel(chunks, x, y, z);
        if (voxel === 0) {
          continue;
        }
        let isVisible = false;
        const isTop = getVoxel(chunks, x, y + 1, z) === 0;
        for (let face = 0; face < 6; face++) {
          const n = normals[face][0];
          const u = normals[face][1];
          const v = normals[face][2];
          const p = auxVectorA.set(x + n.x, y + n.y, z + n.z);
          if (getVoxel(chunks, p.x, p.y, p.z) === 0) {
            isVisible = true;
            faces[offset++] = x + 0.5;
            faces[offset++] = y + 0.5;
            faces[offset++] = z + 0.5;
            faces[offset++] = getTexture(voxel, face, isTop) * 6 + face;
            for (let vertex = 0; vertex < 4; vertex++) {
              const vn = vertices[vertex];
              const vu = auxVectorB.set(u.x * vn.x, u.y * vn.x, u.z * vn.x);
              const vv = auxVectorC.set(v.x * vn.y, v.y * vn.y, v.z * vn.y);
              faces[offset++] = getAO(
                getVoxel(chunks, p.x + vu.x, p.y + vu.y, p.z + vu.z) !== 0,
                getVoxel(chunks, p.x + vv.x, p.y + vv.y, p.z + vv.z) !== 0,
                getVoxel(chunks, p.x + vu.x + vv.x, p.y + vu.y + vv.y, p.z + vu.z + vv.z) !== 0
              );
            }
          }
        }
        if (isVisible) {
          bounds.expandByPoint(auxVectorA.set(x, y, z));
          bounds.expandByPoint(auxVectorA.set(x + 1, y + 1, z + 1));
        }
      }
    }
  }

  return { bounds, faces: new Float32Array(faces) };
};

export const voxelColliders = (
  chunks: ChunkData[]
) => {
  const colliders: { position: [number, number, number], size: [number, number, number] }[] = [];
  map.fill(0);

  let collider = 0;
  for (let z = 0; z < chunkSize; z++) {
    for (let y = 0; y < chunkSize; y++) {
      for (let x = 0; x < chunkSize; x++) {
        const voxel = getVoxel(chunks, x, y, z);
        if (
          voxel === 0
          || map[z * chunkSize * chunkSize + y * chunkSize + x]
        ) {
          continue;
        }

        let width = 0;
        let height = 0
        let depth = 0;
        for (let i = z + 1; i <= chunkSize; i++) {
          if (
            i == chunkSize
            || getVoxel(chunks, x, y, i) == 0
            || map[i * chunkSize * chunkSize + y * chunkSize + x]
          ) {
            depth = i - z;
            break;
          }
        }

        height = chunkSize - y;
        for (let i = z; i < z + depth; i++) {
          for (let j = y + 1; j <= y + height; j++) {
            if (
              j == chunkSize
              || getVoxel(chunks, x, j, i) == 0
              || map[i * chunkSize * chunkSize + j * chunkSize + x]
            ) {
              height = j - y;
            }
          }
        }

        width = chunkSize - x;
        for (let i = z; i < z + depth; i++) {
          for (let j = y; j < y + height; j++) {
            for (let k = x + 1; k <= x + width; k++) {
              if (
                k == chunkSize
                || getVoxel(chunks, k, j, i) == 0
                || map[i * chunkSize * chunkSize + j * chunkSize + k]
              ) {
                width = k - x;
              }
            }
          }
        }

        for (let i = z; i < z + depth; i++) {
          for (let j = y; j < y + height; j++) {
            for (let k = x; k < x + width; k++) {
              map[i * chunkSize * chunkSize + j * chunkSize + k] = 1;
            }
          }
        }

        colliders[collider++] = {
          position: [x, y, z],
          size: [width, height, depth],
        };
      }
    }
  }

  return colliders;
};
