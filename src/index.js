import * as three from 'three';
import './style.css';

import Controls from './controls';
import { build } from './build';

import * as clipperLib from 'js-angusj-clipper/web';

async function mainAsync() {

const clipper = await clipperLib.loadNativeClipperLibInstanceAsync(
  clipperLib.NativeClipperLibRequestedFormat.WasmWithAsmJsFallback
);

const renderer = new three.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = three.sRGBEncoding;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', onWindowResize, false);

function onWindowResize(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );
}

const camera = new three.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const controls = new Controls(camera, renderer.domElement);

const scene = new three.Scene();

const light = new three.AmbientLight(0x404040);
scene.add(light);

const directionalLight = new three.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

// main drawing
build(scene, clipper)

function animate() {
  requestAnimationFrame(animate);
  controls.update()
  renderer.render(scene, camera);
}
animate();

}

mainAsync();
