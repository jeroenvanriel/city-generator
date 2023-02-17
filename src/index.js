import * as three from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './style.css';
import model from './model.glb';

import blocks from './blocks';
import building from './merge';
import { getRandomInt } from './utils';

const renderer = new three.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = three.sRGBEncoding;
document.body.appendChild(renderer.domElement);

const camera = new three.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(150, 50, 150);
controls.target.set(0, 8, 0);
controls.update()


const scene = new three.Scene();

const loader = new GLTFLoader();
loader.load(model, function(gltf) {
  scene.add(gltf.scene);
}, undefined, function(error) {
  console.error(error);
});

const light = new three.AmbientLight(0x404040);
scene.add(light);

const directionalLight = new three.DirectionalLight(0xffffff, 0.5);
scene.add(directionalLight);

// add some blocks
blocks(scene)

// add 10 random buildings
for (let i = 0; i < 10; i++ ) {
  const b = building();
  b.position.add(new three.Vector3(getRandomInt(0, 200), 0, getRandomInt(0, 200)))
  scene.add(b)
}


function animate() {
  requestAnimationFrame(animate);

  controls.update();
  renderer.render(scene, camera);
}
animate();
