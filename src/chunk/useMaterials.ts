import React from 'react';
import { DataArrayTexture, SRGBColorSpace, Texture } from 'three';
import { ChunkMaterial, ChunkDepthMaterial } from './ChunkMaterial';

const getAtlasTexture = (atlas: Texture) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error();
  }
  canvas.width = atlas.image.width;
  canvas.height = atlas.image.height;
  ctx.drawImage(atlas.image, 0, 0);
  const texture = new DataArrayTexture(
    ctx.getImageData(0, 0, canvas.width, canvas.height).data,
    canvas.width,
    canvas.width,
    canvas.height / canvas.width
  );
  texture.anisotropy = atlas.anisotropy;
  texture.minFilter = atlas.minFilter;
  texture.magFilter = atlas.magFilter;
  texture.needsUpdate = true;
  return texture;
};

export const useMaterials = (
  atlas?: DataArrayTexture | Texture,
  normalAtlas?: DataArrayTexture | Texture,
  occlusionRoughnessMetalnessAtlas?: DataArrayTexture | Texture,
) => {
  const atlases = {
    atlas: React.useRef<DataArrayTexture | null>(null),
    normalAtlas: React.useRef<DataArrayTexture | null>(null),
    occlusionRoughnessMetalnessAtlas: React.useRef<DataArrayTexture | null>(null),
  };
  const depthMaterial = React.useRef<ChunkDepthMaterial>(null!);
  if (!depthMaterial.current) {
    depthMaterial.current = new ChunkDepthMaterial();
  }
  const opaqueMaterial = React.useRef<ChunkMaterial>(null!);
  if (!opaqueMaterial.current) {
    opaqueMaterial.current = new ChunkMaterial(false);
  }
  const transparentMaterial = React.useRef<ChunkMaterial>(null!);
  if (!transparentMaterial.current) {
    transparentMaterial.current = new ChunkMaterial(true);
  }
  React.useLayoutEffect(() => {
    if (atlases.atlas.current) {
      atlases.atlas.current.dispose();
    }
    let texture = atlas;
    if (texture && !(texture instanceof DataArrayTexture)) {
      texture = getAtlasTexture(texture);
      texture.colorSpace = SRGBColorSpace;
    }
    atlases.atlas.current = texture as (DataArrayTexture | null);
    opaqueMaterial.current.setAtlas(atlases.atlas.current);
    transparentMaterial.current.setAtlas(atlases.atlas.current);
  }, [atlas]);
  React.useLayoutEffect(() => {
    if (atlases.normalAtlas.current) {
      atlases.normalAtlas.current.dispose();
    }
    let texture = normalAtlas;
    if (texture && !(texture instanceof DataArrayTexture)) {
      texture = getAtlasTexture(texture);
    }
    atlases.normalAtlas.current = texture as (DataArrayTexture | null);
    opaqueMaterial.current.setNormalAtlas(atlases.normalAtlas.current);
    transparentMaterial.current.setNormalAtlas(atlases.normalAtlas.current);
  }, [normalAtlas]);
  React.useLayoutEffect(() => {
    if (atlases.occlusionRoughnessMetalnessAtlas.current) {
      atlases.occlusionRoughnessMetalnessAtlas.current.dispose();
    }
    let texture = occlusionRoughnessMetalnessAtlas;
    if (texture && !(texture instanceof DataArrayTexture)) {
      texture = getAtlasTexture(texture);
    }
    atlases.occlusionRoughnessMetalnessAtlas.current = texture as (DataArrayTexture | null);
    opaqueMaterial.current.setOcclusionRoughnessMetalnessAtlas(atlases.occlusionRoughnessMetalnessAtlas.current);
    transparentMaterial.current.setOcclusionRoughnessMetalnessAtlas(atlases.occlusionRoughnessMetalnessAtlas.current);
  }, [occlusionRoughnessMetalnessAtlas]);
  return {
    depthMaterial,
    opaqueMaterial,
    transparentMaterial,
  };
};
