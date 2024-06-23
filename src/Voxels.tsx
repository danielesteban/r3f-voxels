import React from 'react';
import { GroupProps, useFrame } from '@react-three/fiber';
import { Box3, DataArrayTexture, Texture, Vector3 } from 'three';
import { Chunk } from './chunk/Chunk';
import { ChunkMaterial, ChunkDepthMaterial } from './chunk/ChunkMaterial';
import { DataProvider } from './data/DataProvider';
import { chunkSize, useData, VoxelFace } from './data/Data';

export type VoxelsApi = {
  exportChunks: () => { [key: string]: Uint8Array };
  importChunks: (chunks: { [key: string]: Uint8Array }) => void;
  getMaterial: () => ChunkMaterial;
  getVoxel: (position: Vector3) => number;
  setVoxel: (position: Vector3, value: number) => void;
};

type ChunksProps = {
  atlas?: DataArrayTexture | Texture;
  normalAtlas?: DataArrayTexture | Texture;
  occlusionRoughnessMetalnessAtlas?: DataArrayTexture | Texture;
  bounds?: Box3;
  followCamera?: boolean;
  metalness?: number;
  roughness?: number;
} & Omit<GroupProps, 'ref'>;

type VoxelsProps = {
  generator?: (x: number, y: number, z: number) => number;
  getPhysics?: () => { world: any; rapier: any };
  getTexture?: (voxel: number, face: VoxelFace, isTop: boolean) => number;
} & ChunksProps;

const aux = new Vector3();

const Chunks = React.memo(React.forwardRef<VoxelsApi, ChunksProps>(({
  atlas,
  normalAtlas,
  occlusionRoughnessMetalnessAtlas,
  bounds = new Box3(new Vector3(-5, 0, -5), new Vector3(5, 2, 5)),
  followCamera = false,
  metalness = occlusionRoughnessMetalnessAtlas ? 1 : 0,
  roughness = 1,
  ...props
}, ref) => {
  const { loaded, exportChunks, importChunks, loadChunks, getVoxel, setVoxel } = useData();
  React.useImperativeHandle(ref, () => ({
    exportChunks,
    importChunks,
    getMaterial: () => material.current,
    getVoxel,
    setVoxel,
  }), []);
  const material = React.useRef<ChunkMaterial>(null!);
  if (!material.current) {
    material.current = new ChunkMaterial();
  }
  React.useLayoutEffect(() => (
    material.current.setAtlas(atlas)
  ), [atlas]);
  React.useLayoutEffect(() => (
    material.current.setNormalAtlas(normalAtlas)
  ), [normalAtlas]);
  React.useLayoutEffect(() => (
    material.current.setOcclusionRoughnessMetalnessAtlas(occlusionRoughnessMetalnessAtlas)
  ), [occlusionRoughnessMetalnessAtlas]);
  React.useLayoutEffect(() => {
    material.current.metalness = metalness;
    material.current.roughness = roughness;
  }, [metalness, roughness]);
  const depthMaterial = React.useRef<ChunkDepthMaterial>(null!);
  if (!depthMaterial.current) {
    depthMaterial.current = new ChunkDepthMaterial();
  }
  const { chunks, origin } = loaded.use();
  useFrame(({ camera }) => {
    if (followCamera) {
      aux.set(camera.position.x, 0, camera.position.z).divideScalar(chunkSize).floor();
    } else {
      aux.set(0, 0, 0);
    }
    if (!origin || !origin.equals(aux)) {
      loadChunks(aux, bounds);
    }
  });
  return (
    <group {...props}>
      {chunks.map((key) => (
        <Chunk
          key={key}
          chunkKey={key}
          material={material.current}
          depthMaterial={depthMaterial.current}
        />
      ))}
    </group>
  );
}));

export const Voxels = React.memo(React.forwardRef<VoxelsApi, VoxelsProps>(({
  generator,
  getPhysics,
  getTexture,
  ...props
}, ref) => (
  <DataProvider generator={generator} getPhysics={getPhysics} getTexture={getTexture}>
    <Chunks {...props} ref={ref} />
  </DataProvider>
)));
