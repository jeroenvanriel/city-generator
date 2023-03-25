import * as three from 'three';
import './style.css';

import network from './networks/grid.net.xml';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import Controls from './controls';
import { build, loadBird, loadObjects, addBirds } from './build';

import { EffectComposer, RenderPass, EffectPass, DepthOfFieldEffect } from 'postprocessing';

import * as clipperLib from 'js-angusj-clipper/web';
import { getBounds } from './network';
import bird from './models/stork.glb';
import { getBirdPositions } from './utils';

async function mainAsync() {

const clipper = await clipperLib.loadNativeClipperLibInstanceAsync(
  clipperLib.NativeClipperLibRequestedFormat.WasmWithAsmJsFallback
);

const renderer = new three.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = three.sRGBEncoding;
renderer.shadowMap.enabled = false;
renderer.shadowMap.type = three.PCFShadowMap; //THREE.BasicShadowMap | THREE.PCFShadowMap |  THREE.VSMShadowMap | THREE.PCFSoftShadowMap

document.body.appendChild(renderer.domElement);

window.addEventListener('resize', onWindowResize, false);

function onWindowResize(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );
  composer.setSize( window.innerWidth, window.innerHeight)
}

const camera = new three.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const controls = new Controls(camera, renderer.domElement);

const scene = new three.Scene();

// main drawing
build(scene, clipper)

// load in bird
var birdObj;
birdObj = loadBird(scene, birdObj);

console.log("model in index " + birdObj)

const birdPosistions = getBirdPositions(getBounds(network.net, 10));
const startPos = birdPosistions[0], endPos = birdPosistions[1];

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const depthOfFieldEffect = new DepthOfFieldEffect(camera, {
  focalLength: 0.3,
  bokehScale: 2.0,
  width: window.innerWidth, height: window.innerHeight
});

composer.addPass(new EffectPass(
  camera,
  depthOfFieldEffect,
));

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  composer.render();
}
animate();

}

mainAsync();
