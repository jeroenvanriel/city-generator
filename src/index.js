import * as three from 'three';
import './style.css';

import Controls from './controls';
import { build } from './build';

import { EffectComposer, RenderPass, EffectPass, SMAAEffect, DepthOfFieldEffect } from 'postprocessing';

import * as clipperLib from 'js-angusj-clipper/web';

async function mainAsync() {

const clipper = await clipperLib.loadNativeClipperLibInstanceAsync(
  clipperLib.NativeClipperLibRequestedFormat.WasmWithAsmJsFallback
);

const renderer = new three.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = three.sRGBEncoding;
renderer.shadowMap.enabled = true;
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
  new SMAAEffect(),
));

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  composer.render();
}
animate();

}

mainAsync();
