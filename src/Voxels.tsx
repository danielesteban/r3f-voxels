import React from 'react';
import { GroupProps, useFrame } from '@react-three/fiber';
import { Box3, DataArrayTexture, Texture, Vector3 } from 'three';
import { Chunk } from './chunk/Chunk';
import { ChunkMaterial, ChunkDepthMaterial } from './chunk/ChunkMaterial';
import { DataProvider } from './data/DataProvider';
import { chunkSize, useData, VoxelFace } from './data/Data';

type useDataType = ReturnType<typeof useData>;

export type VoxelsApi = {
  addEventListener: useDataType['addEventListener'],
  removeEventListener: useDataType['removeEventListener'],
  exportChunks: useDataType['exportChunks'],
  importChunks: useDataType['importChunks'],
  getMaterial: () => ChunkMaterial,
  getVoxel: useDataType['getVoxel'],
  setVoxel: useDataType['setVoxel'],
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

const VoxelsContext = React.createContext<VoxelsApi | null>(null);

const aux = new Vector3();

const Chunks = React.memo(React.forwardRef<VoxelsApi, ChunksProps>(({
  children,
  atlas,
  normalAtlas,
  occlusionRoughnessMetalnessAtlas,
  bounds = new Box3(new Vector3(-5, 0, -5), new Vector3(5, 2, 5)),
  followCamera = false,
  metalness = occlusionRoughnessMetalnessAtlas ? 1 : 0,
  roughness = 1,
  ...props
}, ref) => {
  const { loaded, addEventListener, removeEventListener, exportChunks, importChunks, loadChunks, getVoxel, setVoxel } = useData();
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
  const api = React.useMemo<VoxelsApi>(() => ({
    addEventListener,
    removeEventListener,
    exportChunks,
    importChunks,
    getMaterial: () => material.current,
    getVoxel,
    setVoxel,
  }), []);
  React.useImperativeHandle(ref, () => api, [api]);
  return (
    <>
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
      <VoxelsContext.Provider value={api}>
        {children}
      </VoxelsContext.Provider>
    </>
  );
}));

export const Voxels = React.memo(React.forwardRef<VoxelsApi, VoxelsProps>(({
  children,
  generator,
  getPhysics,
  getTexture,
  ...props
}, ref) => (
  <DataProvider generator={generator} getPhysics={getPhysics} getTexture={getTexture}>
    <Chunks {...props} ref={ref}>
      {children}
    </Chunks>
  </DataProvider>
)));

export const useVoxels = () => {
  const api = React.useContext(VoxelsContext);
  if (!api) {
    throw new Error(
      'r3f-voxels: useVoxels must be used within <Voxels />!',
    );
  }
  return api;
};
