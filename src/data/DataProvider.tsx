import React from 'react';
import { createDataStore, DataContext, VoxelFace } from './Data';

type DataProviderProps = {
  generator?: (x: number, y: number, z: number) => number;
  getPhysics?: () => { world: any; rapier: any };
  getTexture?: (voxel: number, face: VoxelFace, isTop: boolean) => number;
} & React.PropsWithChildren;

export const DataProvider = React.memo(({ children, generator, getPhysics, getTexture }: DataProviderProps) => {
  const store = React.useRef<ReturnType<typeof createDataStore>>(null!);
  if (!store.current) {
    store.current = createDataStore(generator, getPhysics, getTexture);
  }
  return (
    <DataContext.Provider value={store.current}>
      {children}
    </DataContext.Provider>
  );
});
