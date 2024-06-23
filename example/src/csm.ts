import { useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Material, Vector3, WebGLProgramParametersWithUniforms, WebGLRenderer } from 'three';
import { CSM } from 'three/examples/jsm/csm/CSM.js';

export const useCSM = (getMaterial: () => Material) => {
  const camera = useThree(({ camera }) => camera);
  const scene = useThree(({ scene }) => scene);
  const ref = useRef<CSM | null>(null);
  useFrame(() => ref.current?.update());
  useLayoutEffect(() => {
    const csm = new CSM({
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
    const resize = () => csm.updateFrustums();
    window.addEventListener('resize', resize);
    const material = getMaterial();
    const obc = material.onBeforeCompile.bind(material);
    csm.setupMaterial(material);
    const csmobc = material.onBeforeCompile.bind(material);
    material.onBeforeCompile = (parameters: WebGLProgramParametersWithUniforms, renderer: WebGLRenderer) => {
      csmobc(parameters, renderer);
      obc(parameters, renderer);
    };
    ref.current = csm;
    return () => {
      csm.dispose();
      csm.remove();
      material.dispose();
      material.onBeforeCompile = obc;
      window.removeEventListener('resize', resize);
      ref.current = null;
    };
  }, []);
};
