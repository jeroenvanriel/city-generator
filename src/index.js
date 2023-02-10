import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './style.css';
import model from './model.glb';

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(10, 10, 10);
controls.target.set(0, 8, 0);
controls.update()


const scene = new THREE.Scene();

const loader = new GLTFLoader();
loader.load(model, function(gltf) {
  scene.add(gltf.scene);
}, undefined, function(error) {
  console.error(error);
});

const light = new THREE.AmbientLight(0x404040);
scene.add(light);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
scene.add(directionalLight);


function animate() {
  requestAnimationFrame(animate);

  controls.update();
  renderer.render(scene, camera);
}
animate();
