import alea from 'alea';
import { CanvasTexture, DataArrayTexture, NearestFilter } from 'three';
import { VoxelFace } from 'r3f-voxels';

export enum Voxel {
  air,
  dirt,
  glass,
  noise,
  digital,
}

enum Texture {
  dirt,
  grassTop,
  grassSide,
  glass,
  noise,
  digital,
}

export const atlas = (() => {
  const prng = alea('seed');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 32;
  canvas.height = canvas.width * 6;

  // Texture.dirt
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#bbb';
  ctx.fillRect(0, 0, 32, 32);
  ctx.strokeRect(1, 1, 30, 30);

  // Texture.grassTop
  ctx.translate(0, 32);
  ctx.fillStyle = '#9f9';
  ctx.strokeStyle = '#bbb';
  ctx.fillRect(0, 0, 32, 32);
  ctx.strokeRect(1, 1, 30, 30);
  ctx.fillStyle = '#6f6';
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      if (prng() > 0.5) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // Texture.grassSide
  ctx.translate(0, 32);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#bbb';
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillStyle = '#9f9';
  ctx.fillRect(0, 0, 32, 8);
  ctx.strokeRect(1, 1, 30, 30);
  ctx.fillStyle = '#6f6';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 32; x++) {
      if (prng() > 0.5) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // Texture.glass
  ctx.translate(0, 32);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#bbb';
  ctx.strokeRect(1, 1, 30, 30);
  for (let y = 3; y < 30; y+=4) {
    for (let x = 3; x < 30; x+=4) {
      if (prng() > 0.7) {
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  // Texture.noise
  ctx.translate(0, 32);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#bbb';
  ctx.strokeRect(1, 1, 30, 30);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      if (prng() > 0.5) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // Texture.digital
  ctx.translate(0, 32);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#bbb';
  ctx.strokeRect(1, 1, 30, 30);
  for (let y = 3; y < 30; y+=4) {
    for (let x = 3; x < 30; x+=4) {
      if (prng() > 0.3) {
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  const atlas = new CanvasTexture(canvas);
  atlas.minFilter = atlas.magFilter = NearestFilter;
  return atlas;
})();

export const ORMAtlas = (() => {
  const atlas = new DataArrayTexture(new Uint8ClampedArray([
    // Texture.dirt
    255, 127, 0, 255,
    // Texture.grassTop
    255, 127, 0, 255,
    // Texture.grassSide
    255, 127, 0, 255,
    // Texture.glass
    255, 127, 0, 255,
    // Texture.noise
    255, 127, 0, 255,
    // Texture.digital
    255, 0, 127, 255,
  ]), 1, 1, 6);
  atlas.needsUpdate = true;
  return atlas;
})();

export const getTexture = (voxel: Voxel, face: VoxelFace, isTop: boolean) => {
  switch (voxel) {
    case Voxel.dirt:
      if (isTop && face === VoxelFace.top) {
        return Texture.grassTop;  
      }
      if (isTop && face !== VoxelFace.bottom) {
        return Texture.grassSide;
      }
      return Texture.dirt;
    case Voxel.glass:
      return Texture.glass;
    case Voxel.noise:
      return Texture.noise;
    case Voxel.digital:
      return Texture.digital;
  }
  throw new Error('Unknown voxel');
};

export const getTransparent = (voxel: Voxel) => {
  switch (voxel) {
    default:
      return false;
    case Voxel.glass:
      return true;
  }
};
