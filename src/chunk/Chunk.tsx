import React from 'react';
import { extend } from '@react-three/fiber';
import { Material, Vector3 } from 'three';
import { ChunkData, useData } from '../data/Data';
import { voxelMesher, voxelColliders } from './voxelMesher';
import { ChunkMesh } from './ChunkMesh';

interface ChunkProps {
  chunkKey: string;
  depthMaterial: Material;
  opaqueMaterial: Material;
  transparentMaterial: Material;
}

export const Chunk = React.memo(({ chunkKey, depthMaterial, opaqueMaterial, transparentMaterial }: ChunkProps) => {
  const { getChunk, getPhysics, getTexture, getTransparent } = useData();
  const chunkPosition = React.useMemo(() => new Vector3().fromArray(chunkKey.split(':').map((p) => parseInt(p, 10))), [chunkKey]);
  const data: ChunkData[] = [];
  for (let z = -1; z <= 1; z++) {
    for (let y = -1; y <= 1; y++) {
      for (let x = -1; x <= 1; x++) {
        data.push(getChunk(chunkPosition.x + x, chunkPosition.y + y, chunkPosition.z + z).use());
      }
    }
  }
  const chunk = data[13];
  const opaqueMesh = React.useRef<ChunkMesh>(null!);
  const transparentMesh = React.useRef<ChunkMesh>(null!);
  React.useLayoutEffect(() => {
    const { opaque, transparent } = voxelMesher(data, getTexture, getTransparent);
    opaqueMesh.current.update(opaque);
    transparentMesh.current.update(transparent);
  }, data);

  if (getPhysics) {
    // @experimental
    const { world, rapier } = getPhysics();
    const colliders = React.useRef<Map<string, any>>(new Map());
    React.useLayoutEffect(() => {
      const { current } = colliders;
      colliders.current = new Map();
      voxelColliders(data).forEach(({ position, size }) => {
        const key = `${position[0]}:${position[1]}:${position[2]}:${size[0]}:${size[1]}:${size[2]}`;
        let collider = current.get(key);
        if (!collider) {
          collider = world.createCollider(
            rapier.ColliderDesc
              .cuboid(
                size[0] * 0.5,
                size[1] * 0.5,
                size[2] * 0.5
              )
              .setTranslation(
                chunk.position.x + position[0] + size[0] * 0.5,
                chunk.position.y + position[1] + size[1] * 0.5,
                chunk.position.z + position[2] + size[2] * 0.5
              )
          );
        } else {
          current.delete(key);
        }
        colliders.current.set(key, collider);
      });
      current.forEach((collider) => (
        world.removeCollider(collider, true)
      ));
    }, [chunk]);
    React.useLayoutEffect(() => () => colliders.current.forEach((collider) => (
      world.removeCollider(collider, true)
    )), []);
  }

  return (
    <>
      <chunkMesh
        customDepthMaterial={depthMaterial}
        material={opaqueMaterial}
        position={chunk.position}
        castShadow
        receiveShadow
        ref={opaqueMesh}
      />
      <chunkMesh
        customDepthMaterial={depthMaterial}
        material={transparentMaterial}
        position={chunk.position}
        receiveShadow
        ref={transparentMesh}
      />
    </>
  );
});

extend({ ChunkMesh });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      chunkMesh: JSX.IntrinsicElements['mesh'];
    }
  }
}
