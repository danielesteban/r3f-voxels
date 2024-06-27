import {
  DataArrayTexture,
  DoubleSide,
  MeshDepthMaterial,
  MeshStandardMaterial,
  RGBADepthPacking,
  ShaderChunk,
  WebGLProgramParametersWithUniforms,
  WebGLRenderer,
} from 'three';

const Rotation = /* glsl */`
mat3 rotateX(const in float rad) {
  float c = cos(rad);
  float s = sin(rad);
  return mat3(
    1.0, 0.0, 0.0,
    0.0, c, s,
    0.0, -s, c
  );
}
mat3 rotateY(const in float rad) {
  float c = cos(rad);
  float s = sin(rad);
  return mat3(
    c, 0.0, -s,
    0.0, 1.0, 0.0,
    s, 0.0, c
  );
}
mat3 rotateZ(const in float rad) {
  float c = cos(rad);
  float s = sin(rad);
  return mat3(
    c, s, 0.0,
    -s, c, 0.0,
    0.0, 0.0, 1.0
  );
}
`;

const FaceRotation = /* glsl */`
mat3 faceRotation;
switch (int(mod(face.w, 6.0))) {
  default:
    faceRotation = mat3(1.0);
    break;
  case 1:
    faceRotation = rotateX(PI * -0.5);
    break;
  case 2:
    faceRotation = rotateX(PI * 0.5);
    break;
  case 3:
    faceRotation = rotateY(PI * -0.5);
    break;
  case 4:
    faceRotation = rotateY(PI * 0.5);
    break;
  case 5:
    faceRotation = rotateY(PI);
    break;
}
`;

export class ChunkMaterial extends MeshStandardMaterial {
  private readonly atlas: { value: DataArrayTexture | null };
  private readonly normalAtlas: { value: DataArrayTexture | null };
  private readonly ORMAtlas: { value: DataArrayTexture | null };

  constructor(transparent: boolean) {
    super();
    this.atlas = { value: null };
    this.normalAtlas = { value: null };
    this.ORMAtlas = { value: null };
    if (transparent) {
      this.polygonOffset = true;
      this.polygonOffsetFactor = -1;
      this.side = DoubleSide;
      this.transparent = transparent;
    }
  }

  override customProgramCacheKey() {
    return 'chunk';
  }

  override onBeforeCompile(parameters: WebGLProgramParametersWithUniforms, _renderer: WebGLRenderer) {
    parameters.uniforms.atlas = this.atlas;
    parameters.uniforms.normalAtlas = this.normalAtlas;
    parameters.uniforms.ORMAtlas = this.ORMAtlas;
    parameters.vertexShader = parameters.vertexShader
      .replace(
        '#include <common>',
        /* glsl */`
        #include <common>
        attribute vec4 face;
        attribute vec4 ao;
        varying float vAO;
        flat varying int vAtlasTexture;
        varying vec2 vAtlasUV;
        ${Rotation}
        `
      )
      .replace(
        '#include <uv_vertex>',
        /* glsl */`
        #include <uv_vertex>
        bool flipFace = ao.z + ao.y > ao.w + ao.x;
        vAtlasTexture = int(floor(face.w / 6.0));
        vec3 atlasUV = vec3(uv, 1);
        if (flipFace) {
          atlasUV.xy -= 0.5;
          atlasUV = rotateZ(PI * 0.5) * atlasUV;
          atlasUV.xy += 0.5;
        }
        vAtlasUV = atlasUV.xy;
        `
      )
      .replace(
        '#include <beginnormal_vertex>',
        /* glsl */`
        #include <beginnormal_vertex>
        switch (gl_VertexID) {
          default:
            vAO = flipFace ? ao.y : ao.x;
            break;
          case 1:
            vAO = flipFace ? ao.w : ao.y;
            break;
          case 2:
            vAO = flipFace ? ao.x : ao.z;
            break;
          case 3:
            vAO = flipFace ? ao.z : ao.w;
            break;
        }
        vAO = 1.0 - vAO;
        ${FaceRotation}
        if (flipFace) {
          faceRotation *= rotateZ(PI * -0.5);
        }
        objectNormal = faceRotation * objectNormal;
        `
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */`
        vec3 transformed = vec3(faceRotation * position + face.xyz);
        `
      );
    parameters.fragmentShader = parameters.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */`
        #include <common>
        varying float vAO;
        flat varying int vAtlasTexture;
        varying vec2 vAtlasUV;
        `
      )
      .replace(
        '#include <map_pars_fragment>',
        /* glsl */`
        #ifdef USE_ATLAS
        uniform sampler2DArray atlas;
        #endif
        #ifdef USE_NORMAL_ATLAS
        uniform sampler2DArray normalAtlas;
        #endif
        #ifdef USE_ORM_ATLAS
        uniform sampler2DArray ORMAtlas;
        #endif
        `
      )
      .replace(
        '#include <normalmap_pars_fragment>',
        ShaderChunk.normalmap_pars_fragment.replace(
          '#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )',
          '#ifdef USE_NORMAL_ATLAS',
        )
      )
      .replace(
        '#include <roughnessmap_pars_fragment>',
        ''
      )
      .replace(
        '#include <metalnessmap_pars_fragment>',
        ''
      )
      .replace(
        '#include <aomap_pars_fragment>',
        ''
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */`
        vec3 atlasUV = vec3(vAtlasUV, vAtlasTexture);
        #ifdef USE_ATLAS
        diffuseColor *= texture(atlas, atlasUV);
        #endif
        #ifdef USE_ORM_ATLAS
        vec4 ORM = texture(ORMAtlas, atlasUV);
        #endif
        `
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */`
        #ifdef USE_NORMAL_ATLAS
        mat3 tbn = getTangentFrame(-vViewPosition, normal, vAtlasUV);
        #if defined(DOUBLE_SIDED)
    		tbn[0] *= faceDirection;
		    tbn[1] *= faceDirection;
      	#endif
	      normal = normalize(tbn * (texture(normalAtlas, atlasUV).xyz * 2.0 - 1.0));
        #endif
        `
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */`
        float roughnessFactor = roughness;
        #ifdef USE_ORM_ATLAS
        roughnessFactor *= ORM.g;
        #endif
        `
      )
      .replace(
        '#include <metalnessmap_fragment>',
        /* glsl */`
        float metalnessFactor = metalness;
        #ifdef USE_ORM_ATLAS
        metalnessFactor *= ORM.b;
        #endif
        `
      )
      .replace(
        '#include <aomap_fragment>',
        /* glsl */`
        float ambientOcclusion = vAO;
        #ifdef USE_ORM_ATLAS
        ambientOcclusion *= ORM.r;
        #endif
        reflectedLight.indirectDiffuse *= ambientOcclusion;
        #ifdef USE_ENVMAP
        float dotNV = saturate(dot(geometryNormal, geometryViewDir));
        reflectedLight.indirectSpecular *= computeSpecularOcclusion(dotNV, ambientOcclusion, material.roughness);
        #endif
        `
      );
  }

  setAtlas(atlas: DataArrayTexture | null) {
    const { defines } = this;
    if (defines.USE_ATLAS !== !!atlas) {
      defines.USE_ATLAS = !!atlas;
      this.needsUpdate = true;
    }
    this.atlas.value = atlas;
  }

  setNormalAtlas(atlas: DataArrayTexture | null) {
    const { defines } = this;
    if (defines.USE_NORMAL_ATLAS !== !!atlas) {
      defines.USE_NORMAL_ATLAS = !!atlas;
      this.needsUpdate = true;
    }
    this.normalAtlas.value = atlas;
  }

  setOcclusionRoughnessMetalnessAtlas(atlas: DataArrayTexture | null) {
    const { defines } = this;
    if (defines.USE_ORM_ATLAS !== !!atlas) {
      defines.USE_ORM_ATLAS = !!atlas;
      this.needsUpdate = true;
    }
    this.ORMAtlas.value = atlas;
    this.metalness = !!atlas ? 1 : 0;
  }
}

export class ChunkDepthMaterial extends MeshDepthMaterial {
  constructor() {
    super({ depthPacking: RGBADepthPacking });
  }

  override customProgramCacheKey() {
    return 'chunkdepth';
  }

  override onBeforeCompile(parameters: WebGLProgramParametersWithUniforms) {
    parameters.vertexShader = parameters.vertexShader
      .replace(
        '#include <common>',
        /* glsl */`
        #include <common>
        attribute vec4 face;
        ${Rotation}
        `
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */`
        ${FaceRotation}
        vec3 transformed = vec3(faceRotation * position + face.xyz);
        `
      );
  }
}
