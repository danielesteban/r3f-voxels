import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { RapierRigidBody, InstancedRigidBodies, InstancedRigidBodyProps } from '@react-three/rapier';
import { Color, InstancedMesh, Matrix4, Vector3 } from 'three';

export type SpheresApi = {
  shoot: () => void;
};

export const Spheres = forwardRef<SpheresApi>((_props, ref) => {
  const count = 64;
  const bodies = useRef<RapierRigidBody[]>(null!);
  const instances = useMemo<InstancedRigidBodyProps[]>(() => (
    Array.from({ length: count }, (_v, i) => ({
      key: `sphere_${i}`,
      angularVelocity: [Math.random(), Math.random(), Math.random()],
      position: [Math.random() * 32 - 16, 32 + Math.random() * 8, Math.random() * 32 - 16],
      restitution: 0.8,
      canSleep: false,
    }))
  ), []);
  const mesh = useRef<InstancedMesh>(null!);
  useLayoutEffect(() => {
    const vector = new Vector3();
    const matrix = new Matrix4();
    instances.forEach(({ position }, i) => {
      mesh.current.setColorAt(i, new Color(Math.random() * 0xFFFFFF));
      mesh.current.setMatrixAt(i, matrix.makeTranslation(vector.fromArray(position as any)));
    });
  }, []);
  const sphere = useRef(0);
  const raycaster = useThree(({ raycaster }) => raycaster);
  useImperativeHandle(ref, () => ({
    shoot: () => {
      const s = bodies.current[sphere.current];
      s.setAngvel(new Vector3(0, 0, 0), false);
      s.setLinvel(new Vector3(0, 0, 0), false);
      s.setTranslation(raycaster.ray.origin.clone().add(raycaster.ray.direction), false);
      s.applyImpulse(raycaster.ray.direction.clone().multiplyScalar(10 + Math.random() * 10), true);
      sphere.current = (sphere.current + 1) % bodies.current.length;
    },
  }), [raycaster]);
  return (
    <InstancedRigidBodies
      ref={bodies}
      instances={instances}
      colliders="ball"
      includeInvisible
    >
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, count]}
        frustumCulled={false}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.5]} />
        <meshStandardMaterial roughness={0.2} />
      </instancedMesh>
    </InstancedRigidBodies>
  );
});
