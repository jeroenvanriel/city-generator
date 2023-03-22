import * as three from 'three';

import { landMaterial } from './material';

import skybox1 from './textures/sky/TropicalSunnyDayLeft2048.png';
import skybox2 from './textures/sky/TropicalSunnyDayRight2048.png';
import skybox3 from './textures/sky/TropicalSunnyDayUp2048.png';
import skybox4 from './textures/sky/TropicalSunnyDayDown2048.png';
import skybox5 from './textures/sky/TropicalSunnyDayFront2048.png';
import skybox6 from './textures/sky/TropicalSunnyDayBack2048.png';
import { getBounds } from './network';

export function addEnvironment(scene, net) {
  addSkybox(scene);
  addLandMesh(scene, getBounds(net, 10000));
  addLight(scene, getBounds(net, 10));
  scene.fog = new three.Fog(0xcccccc, 400, 1800);
}

function addSkybox(scene) {
  scene.background = new three.CubeTextureLoader().load([
    skybox1, skybox2, skybox3, skybox4, skybox5, skybox6
  ]);
  return scene.background;
}

function addLandMesh(scene, bounds) {
  const [left, bottom, right, top] = bounds;

  const shape = new three.Shape([[left, top], [right, top], [right, bottom], [left, bottom]].map(([x, y]) => new three.Vector2(x, y)))
  shape.closePath();

  const bgMesh = new three.Mesh(new three.ShapeGeometry(shape), landMaterial)
  bgMesh.material.side = three.DoubleSide; // visible from above and below.
  bgMesh.geometry.rotateX(Math.PI / 2);
  bgMesh.receiveShadow = true;

  scene.add(bgMesh);
}

function addLight(scene, bounds) {
  const [left, bottom, right, top] = bounds;

  const centerX = (right - left);
  const centerY = (top - bottom);

  const light = new three.AmbientLight(0x404040);
  scene.add(light);

  const directionalLight = new three.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(centerX, 2000, centerY);
  directionalLight.target.position.set(0, 0, 0);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const shadow = directionalLight.shadow;
  shadow.bias = -0.0001;
  shadow.mapSize.setX(16384);
  shadow.mapSize.setY(16384);
  shadow.radius = 5;
  shadow.camera.bottom = -2000;
  shadow.camera.top = 1000
  shadow.camera.left = -1000;
  shadow.camera.right = 1000;
  shadow.camera.near = 50;
  shadow.camera.far = 10000;
}
