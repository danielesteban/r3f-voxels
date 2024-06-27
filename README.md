r3f-voxels
==

### Examples

* [Basic](https://codesandbox.io/p/sandbox/r3f-voxels-basic-8xd52s)
* [Advanced](https://codesandbox.io/p/sandbox/r3f-voxels-advanced-fpp9j3)

### Installation 

```bash
npm install r3f-voxels
```

### Basic usage

```jsx
import { Canvas } from '@react-three/fiber';
import { Voxels, VoxelsApi } from 'r3f-voxels';
import { Vector3 } from 'three';

const Scene = () => {
  const voxels = useRef<VoxelsApi>(null!);
  useLayoutEffect(() => {
    voxels.current.setVoxel(new Vector3(0, 0, 0), 1);
  }, []);
  return (
    <Voxels ref={voxels} />
  );
};

const App = () =>  (
  <Canvas>
    <Scene />
    <ambientLight />
  </Canvas>
);
```

### Api

```ts
type VoxelsApi = {
  clearChunks: () => void;
  exportChunks: () => { [key: string]: Uint8Array };
  importChunks: (chunks: { [key: string]: Uint8Array }) => void;
  getMaterials: () => { opaque: ChunkMaterial; transparent: ChunkMaterial };
  getVoxel: (position: Vector3) => number;
  setVoxel: (position: Vector3, value: number) => void;
};
```

### Props

```ts
type VoxelsProps = {
  atlas?: DataArrayTexture | Texture;
  normalAtlas?: DataArrayTexture | Texture;
  occlusionRoughnessMetalnessAtlas?: DataArrayTexture | Texture;
  bounds?: Box3;
  followCamera?: boolean;
  generator?: (x: number, y: number, z: number) => number;
  getPhysics?: () => RapierContext;
  getTexture?: (voxel: number, face: VoxelFace, isTop: boolean) => number;
  getTransparent?: (voxel: number) => boolean;
  metalness?: number;
  roughness?: number;
};
```
