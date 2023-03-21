import * as three from 'three';

import asphaltImage from './textures/asphalt.png';
import grassImage from './textures/grass.jpg';

import displacementImage from './textures/displacement.png';

const textureLoader = new three.TextureLoader();

const loadRepeatedTexture = (url) =>
  textureLoader.load(url, texture => {
    texture.wrapS = texture.wrapT = three.RepeatWrapping;
  });

const asphaltTexture = loadRepeatedTexture(asphaltImage);
asphaltTexture.repeat.set(0.05, 0.05);

export const roadMaterial = new three.MeshBasicMaterial({
  map: asphaltTexture,
});

const grassTexture = loadRepeatedTexture(grassImage);
grassTexture.repeat.set(0.1,0.1);
grassTexture.encoding = three.sRGBEncoding;

export const landMaterial = new three.MeshPhysicalMaterial({
  map: grassTexture,
  side: three.DoubleSide, // one side is visible from above, the other casts shadows.
  metalness: 0.1,
  roughness: 1.0,
  clearcoat: 0.1,
  clearcoatRoughness: 1.0,
  reflectivity: 0.05,
  // use polygonOffset to counter z-fighting with roadways.
  polygonOffset: true,
  polygonOffsetFactor: +5,
  polygonOffsetUnits: 1,
});


export const red = new three.MeshStandardMaterial({ color: 'red', side: three.DoubleSide });
export const green = new three.MeshStandardMaterial({ color: 'green', side: three.DoubleSide });
export const blue = new three.MeshStandardMaterial({ color: 'blue', side: three.DoubleSide });

const displacementTexture = loadRepeatedTexture(displacementImage);

export const displacementMaterial = new three.MeshStandardMaterial({
  displacementMap: displacementTexture,
  displacementScale: 1,
  map: displacementTexture,
});
