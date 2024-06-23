import alea from 'alea';
import { Vector3 } from 'three';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import { Voxel } from './atlas';

const aux = new Vector3();
const prng = alea('coolseed');
const simplex = new SimplexNoise({ random: prng });
export const terrain = (x: number, y: number, z: number) => {
  if (y <= 0) {
    return Voxel.dirt;
  }
  if (y >= 16) {
    return Voxel.air;
  }
  let value = 0;
  let amplitude = 1;
  aux.set(x * 0.03, y * 0.03, z * 0.03);
  for (var i = 0; i < 3; i++) {
    value += simplex.noise3d(aux.x, aux.y, aux.z) * amplitude;
    aux.multiplyScalar(2);
    amplitude *= 0.5;
  }
  return value * 16 > y ? Voxel.dirt : Voxel.air;
};
