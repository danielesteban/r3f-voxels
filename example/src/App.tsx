import { Base64 } from 'js-base64';
import { deflateSync, inflateSync } from 'fflate';
import { Suspense, useLayoutEffect, useRef, useState } from 'react';
import { Environment, Grid, OrbitControls } from '@react-three/drei';
import { Canvas, ThreeEvent, useFrame } from '@react-three/fiber';
import { Physics, useRapier } from '@react-three/rapier';
import styled from 'styled-components';
import { Mesh } from 'three';
import tunnel from 'tunnel-rat';
import { useDrag } from '@use-gesture/react';
import { chunkSize, Voxels, VoxelsApi } from 'r3f-voxels';
import { atlas, ORMAtlas, getTexture, getTransparent, Voxel } from './atlas';
import { CSM, useCSM } from './CSM';
import { terrain } from './generator';
import { Spheres, SpheresApi } from './Spheres';

const ui = tunnel();

const Scene = () => {
  const autosave = useRef<number>(-1);
  const [brush, setBrush] = useState(1);
  const spheres = useRef<SpheresApi>(null!);
  const voxels = useRef<VoxelsApi>(null!);
  const bind = useDrag<ThreeEvent<PointerEvent>>(({ event, distance, last }) => {
    if (last && Math.max(distance[0], distance[1]) < 5) {
      const remove = event.button !== 0;
      const point = event.point.addScaledVector(event.face!.normal.transformDirection(event.object.matrixWorld), 0.5 * (remove ? -1 : 1)).floor();
      if (point.y >= 0 && point.y < chunkSize * 2) {
        if (event.button === 1) {
          setBrush(voxels.current.getVoxel(point));
        } else {
          voxels.current.setVoxel(point, remove ? 0 : brush);
          clearTimeout(autosave.current);
          autosave.current = setTimeout(save, 3000);
        }
      }
    }
  }, { pointer: { buttons: [1, 2, 4] }});
  useLayoutEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      const brush = e.keyCode - 48;
      if (brush > 0 && brush <= 4) {
        setBrush(brush);
      }
      if (e.key === ' ') {
        spheres.current.shoot();
      }
    };
    document.body.addEventListener('keydown', keydown);
    return () => document.body.removeEventListener('keydown', keydown);
  }, []);

  const csm = useCSM();
  useLayoutEffect(() => {
    const { opaque, transparent } = voxels.current.getMaterials();
    const materialsCSM = [
      csm.setupMaterial(opaque),
      csm.setupMaterial(transparent),
    ];
    return () => materialsCSM.forEach((dispose) => dispose());
  }, []);

  const grid = useRef<Mesh>(null!);
  useFrame(({ camera }) => (
    grid.current.position.set(camera.position.x, 0, camera.position.z)
  ));

  useLayoutEffect(() => {
    const stored = localStorage.getItem('chunks');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      const decoded: { [key: string]: Uint8Array } = {};
      for (let [key, data] of Object.entries<string>(parsed)) {
        decoded[key] = inflateSync(Base64.toUint8Array(data));
      }
      voxels.current.importChunks(decoded);
    } catch (e) {}
  }, []);
  const [saved, setSaved] = useState(false);
  const save = () => {
    const chunks = voxels.current.exportChunks();
    const encoded: { [key: string]: string } = {};
    for (let [key, data] of Object.entries(chunks)) {
      encoded[key] = Base64.fromUint8Array(deflateSync(data));
    }
    localStorage.setItem('chunks', JSON.stringify(encoded));
    setSaved(true);
    setTimeout(() => setSaved(false), 1000);
  };
  const reset = () => {
    if (!confirm('Are you sure?')) return;
    localStorage.removeItem('chunks');
    location.reload();
  };

  return (
    <>
      <group {...(bind() as any)}>
        <Voxels
          atlas={atlas}
          occlusionRoughnessMetalnessAtlas={ORMAtlas}
          generator={terrain}
          getPhysics={useRapier}
          getTexture={getTexture}
          getTransparent={getTransparent}
          followCamera
          ref={voxels}
        />
        <mesh ref={grid} rotation={[Math.PI * -0.5, 0, 0]}>
          <planeGeometry args={[256, 256]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      </group>
      <Spheres ref={spheres} />
      <Grid cellSize={1} cellColor="#9d4b4b" sectionSize={16} sectionColor="#6f6f6f" followCamera infiniteGrid />
      <ui.In>
        <Brushes>
          <Brush $active={brush === Voxel.dirt} onClick={() => setBrush(Voxel.dirt)}>
            1
          </Brush>
          <Brush $active={brush === Voxel.glass} onClick={() => setBrush(Voxel.glass)}>
            2
          </Brush>
          <Brush $active={brush === Voxel.noise} onClick={() => setBrush(Voxel.noise)}>
            3
          </Brush>
          <Brush $active={brush === Voxel.digital} onClick={() => setBrush(Voxel.digital)}>
            4
          </Brush>
        </Brushes>
        <UI>
          <button onClick={reset}>
            Reset
          </button>
          <button onClick={save}>
            {saved ? 'Saved!' : 'Save'}
          </button>
        </UI>
      </ui.In>
    </>
  );
};

export const App = () => (
  <>
    <Canvas camera={{ position: [0, 8, 24] }} shadows>
      <Suspense>
        <Physics colliders={false}>
          <CSM>
            <Scene />
          </CSM>
        </Physics>
      </Suspense>
      <Environment background backgroundBlurriness={0.5} blur={0.5} environmentIntensity={0.5} preset="sunset" />
      <OrbitControls target={[0, 4, 0]} />
    </Canvas>
    <ui.Out />
  </>
);

const UI = styled.div`
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  display: flex;
  gap: 0.5rem;
`;

const Brushes = styled.div`
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translate(-50%, 0);
  display: flex;
  gap: 0.5rem;
`;

const Brush = styled.button<{ $active: boolean }>`
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ $active }) => $active ? '#333' : 'rgba(0, 0, 0, .2)'};
  color: #fff;
  cursor: ${({ $active }) => $active ? 'default' : 'pointer'};
`;
