import * as three from 'three';

const textureLoader = new three.TextureLoader();

const loadRepeatedTexture = (url) =>
  textureLoader.load(url, texture => {
    texture.wrapS = texture.wrapT = three.RepeatWrapping;
  });

// debug textures

export const red = new three.MeshStandardMaterial({ color: 'red', side: three.DoubleSide });
export const green = new three.MeshStandardMaterial({ color: 'green', side: three.DoubleSide });
export const blue = new three.MeshStandardMaterial({ color: 'blue', side: three.DoubleSide });

// asphalt

import asphaltImage from './textures/asphalt.png';
const asphaltTexture = loadRepeatedTexture(asphaltImage);
asphaltTexture.repeat.set(0.05, 0.05);
export const roadMaterial = new three.MeshBasicMaterial({
  map: asphaltTexture,
});

// grass

import grassImage from './textures/grass.jpg';
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

// brick

import brickImage from './textures/brick.jpg';
const brickTexture = loadRepeatedTexture(brickImage);
brickTexture.repeat.set(0.08, 0.08);
export const brickMaterial = new three.MeshStandardMaterial({ map: brickTexture });

// concrete

import concreteImage from './textures/concrete.jpg';
const concreteTexture = loadRepeatedTexture(concreteImage);
concreteTexture.repeat.set(0.05, 0.05);
export const concreteMaterial = new three.MeshStandardMaterial({ map: concreteTexture });

// roof

import roofImage from './textures/roof.jpg';
const roofTexture = loadRepeatedTexture(roofImage);
roofTexture.repeat.set(0.025, 0.05);
export const roofMaterial = new three.MeshStandardMaterial({ map: roofTexture });
