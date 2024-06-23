import {
  Box3,
  BufferAttribute,
  InstancedBufferGeometry,
  InstancedInterleavedBuffer,
  InterleavedBufferAttribute,
  Intersection,
  Matrix4,
  Mesh,
  Object3D,
  Object3DEventMap,
  PlaneGeometry,
  Raycaster,
  Sphere,
  Vector4,
} from 'three';

const _face = new Vector4();
const _intersects: Intersection<Object3D<Object3DEventMap>>[] = [];
const _sphere = new Sphere();
const _translation = new Matrix4();

export class ChunkMesh extends Mesh {
  private static geometry?: {
    index: BufferAttribute,
    position: BufferAttribute,
    normal: BufferAttribute,
    uv: BufferAttribute,
    instance: Mesh,
    rotations: Matrix4[],
  };

  private static getGeometry() {
    if (!ChunkMesh.geometry) { 
      const face = new PlaneGeometry(1, 1, 1, 1);
      face.translate(0, 0, 0.5);
      const uv = face.getAttribute('uv');
      for (let i = 0, l = uv.count; i < l; i++) {
        uv.setXY(i, uv.getX(i), 1.0 - uv.getY(i));
      }
      ChunkMesh.geometry = {
        index: face.getIndex() as BufferAttribute,
        position: face.getAttribute('position') as BufferAttribute,
        normal: face.getAttribute('normal') as BufferAttribute,
        uv: uv as BufferAttribute,
        instance: new Mesh(face),
        rotations: Array.from({ length: 6 }, (_, i) => {
          const rotation = new Matrix4();
          switch (i) {
            case 1:
              rotation.makeRotationX(Math.PI * -0.5);
              break;
            case 2:
              rotation.makeRotationX(Math.PI * 0.5);
              break;
            case 3:
              rotation.makeRotationY(Math.PI * -0.5);
              break;
            case 4:
              rotation.makeRotationY(Math.PI * 0.5);
              break;
            case 5:
              rotation.makeRotationY(Math.PI);
              break;
          }
          return rotation;
        }),
      };
    }
    return ChunkMesh.geometry;
  }

  declare geometry: InstancedBufferGeometry;

  constructor() {
    const geometry = new InstancedBufferGeometry();
    geometry.boundingSphere = new Sphere();
    const { index, position, normal, uv } = ChunkMesh.getGeometry();
    geometry.setIndex(index);
    geometry.setAttribute('position', position);
    geometry.setAttribute('normal', normal);
    geometry.setAttribute('uv', uv);
    super(geometry);
    this.castShadow = true;
    this.receiveShadow = true;
    this.visible = false;
  }

  override raycast(raycaster: Raycaster, intersects: Intersection<Object3D<Object3DEventMap>>[]) {
    const { instance, rotations } = ChunkMesh.getGeometry();
    const { geometry, matrixWorld, visible } = this;
    if (!visible) {
      return;
    }
    _sphere.copy(geometry.boundingSphere!);
    _sphere.applyMatrix4(matrixWorld);
    if (!raycaster.ray.intersectsSphere(_sphere)) {
      return;
    }
    const face = geometry.getAttribute('face') as BufferAttribute;
    for (let i = 0, l = geometry.instanceCount; i < l; i++) {
      _face.fromBufferAttribute(face, i);
      instance.matrixWorld
        .multiplyMatrices(matrixWorld, _translation.makeTranslation(_face.x, _face.y, _face.z))
        .multiply(rotations[Math.floor(_face.w % 6)]);
      instance.raycast(raycaster, _intersects);
      _intersects.forEach((intersect) => {
        intersect.object = this;
        intersect.face?.normal.transformDirection(instance.matrixWorld);
        intersects.push(intersect);
      });
      _intersects.length = 0;
    }
  }

  update({ bounds, faces }: { bounds: Box3, faces: Float32Array }) {
    const { geometry } = this;
    const count = faces.length / 8;
    if (!count) {
      this.visible = false;
      return;
    }
    bounds.getBoundingSphere(geometry.boundingSphere!);
    const buffer = new InstancedInterleavedBuffer(faces, 8, 1);
    geometry.setAttribute('face', new InterleavedBufferAttribute(buffer, 4, 0));
    geometry.setAttribute('ao', new InterleavedBufferAttribute(buffer, 4, 4));
    geometry.instanceCount = (geometry as any)._maxInstanceCount = count;
    this.visible = true;
  }
}
