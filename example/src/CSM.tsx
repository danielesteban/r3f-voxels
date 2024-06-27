import { createContext, memo, useCallback, useContext, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Material, Vector3, WebGLProgramParametersWithUniforms, WebGLRenderer } from 'three';
import { CSM as CSMImpl } from 'three/examples/jsm/csm/CSM.js';

export type CSMApi = {
  setupMaterial: (material: Material) => () => void;
};

const CSMContext = createContext<CSMApi | null>(null);

export const CSM = memo(({ children }: React.PropsWithChildren) => {
  const camera = useThree(({ camera }) => camera);
  const scene = useThree(({ scene }) => scene);
  const ref = useRef<CSMImpl | null>(null);
  const materials = useRef<Map<Material, Material['onBeforeCompile']>>(null!);
  if (!materials.current) {
    materials.current = new Map();
  }
  const setupMaterial = useCallback((obc: Material['onBeforeCompile'], material: Material) => {
    if (!ref.current) return;
    ref.current.setupMaterial(material);
    const csmobc = material.onBeforeCompile.bind(material);
    material.onBeforeCompile = (parameters: WebGLProgramParametersWithUniforms, renderer: WebGLRenderer) => {
      csmobc(parameters, renderer);
      obc(parameters, renderer);
    };
  }, []);
  const dispose = useCallback(() => {
    if (!ref.current) return;
    ref.current.dispose();
    materials.current.forEach((obc, material) => {
      material.dispose();
      material.onBeforeCompile = obc;
    });
  }, []);
  useLayoutEffect(() => {
    const csm = new CSMImpl({
      camera,
      cascades: 4,
      lightDirection: (new Vector3(-0.5, -1, -0.25)).normalize(),
      lightIntensity: 0.5,
      maxFar: 1000,
      mode: 'practical',
      parent: scene,
      shadowMapSize: 2048,
    });
    csm.fade = true;
    csm.updateFrustums();
    ref.current = csm;
    const resize = () => csm.updateFrustums();
    window.addEventListener('resize', resize);
    materials.current.forEach(setupMaterial);
    return () => {
      csm.remove();
      dispose();
      window.removeEventListener('resize', resize);
      ref.current = null;
    };
  }, []);
  useFrame(() => ref.current?.update());
  const api = useMemo<CSMApi>(() => ({
    setupMaterial: (material: Material) => {
      if (materials.current.has(material)) {
        throw new Error('Already setup material');
      }
      const obc = material.onBeforeCompile.bind(material);
      setupMaterial(obc, material);
      materials.current.set(material, obc);
      return () => {
        dispose();
        materials.current.delete(material);
        materials.current.forEach(setupMaterial);
      };
    },
  }), []);
  return (
    <CSMContext.Provider value={api}>
      {children}
    </CSMContext.Provider>
  );
});

export const useCSM = () => {
  const api = useContext(CSMContext);
  if (!api) {
    throw new Error(
      'CSM: useCSM must be used within <CSM />!',
    );
  }
  return api;
};
