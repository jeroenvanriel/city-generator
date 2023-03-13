import * as three from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MapControls, OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';
import './style.css';

import { loadNetwork } from './network.js';
import grid from './grid'
import { getRandomInt, polygonToMesh, offsetPolygon, toClipper, fromClipper, SCALE } from './utils';

import * as clipperLib from 'js-angusj-clipper/web';

import network from './networks/grid.net.xml';
import block1 from './models/block1.glb';
import { roadMaterial } from './material';
import { addEnvironment } from './environment';

import { createGridBuilding } from '../gridbuilding';

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

const controls_move = new MapControls(camera, renderer.domElement);
controls_move.enableDamping = true;
controls_move.dampingFactor = 0.05;
controls_move.screenSpacePanning = false;
controls_move.enableZoom = false;
controls_move.rotateSpeed = 0.5;
controls_move.maxPolarAngle = 0.495 * Math.PI;
controls_move.enablePan = true;

const controls_zoom = new TrackballControls(camera, renderer.domElement);
controls_zoom.noRotate = true;
controls_zoom.noPan = true;
controls_zoom.noZoom = false;
controls_zoom.zoomSpeed = 0.4;
controls_zoom.dynamicDampingFactor = 0.05; // set dampening factor
controls_zoom.minDistance = 10;
controls_zoom.maxDistance = 1000;

loadCameraLocation();

function saveCoordinateToStorage(target, prefix) {
  localStorage.setItem(prefix + ".x", target.x)
  localStorage.setItem(prefix + ".y", target.y)
  localStorage.setItem(prefix + ".z", target.z)
}

function loadCoordinateFromStorage(target, prefix) {
  target.set(
    parseFloat(localStorage.getItem(prefix + ".x")),
    parseFloat(localStorage.getItem(prefix + ".y")),
    parseFloat(localStorage.getItem(prefix + ".z")),
  )
}

function saveCameraLocation() {
  saveCoordinateToStorage(controls_move.target, "target")
  saveCoordinateToStorage(camera.position, "camera.position")
  saveCoordinateToStorage(camera.rotation, "camera.rotation")
}

function loadCameraLocation() {
  if (
    localStorage.getItem("camera.position.x") !== null &&
    localStorage.getItem("camera.rotation.x") !== null &&
    localStorage.getItem("target.x") !== null
  ) {
    loadCoordinateFromStorage(camera.position, "camera.position")
    loadCoordinateFromStorage(camera.rotation, "camera.rotation")
    loadCoordinateFromStorage(controls_move.target, "target")
  } else { 
    camera.position.set(-50, 200, -50)
    controls_move.target.set(150, 0, -100);
    controls_move.update();
  }
}

const scene = new three.Scene();

const light = new three.AmbientLight(0x404040);
scene.add(light);

const directionalLight = new three.DirectionalLight(0xffffff, 0.5);
scene.add(directionalLight);

const r = loadNetwork(network.net, clipper)
const [ road_polygon, side_line_polygons, between_line_polygons ] = r;

const road_mesh = polygonToMesh(road_polygon, roadMaterial);
road_mesh.translateZ(0.02); // to prevent "intersection" with lines
scene.add(road_mesh);

const line_material = new three.MeshStandardMaterial( { color: 0xffffff } );
side_line_polygons.map(p => scene.add(polygonToMesh(p, line_material)));
// TODO: make these dashed
between_line_polygons.map(p => scene.add(polygonToMesh(p, line_material)));

addEnvironment(scene, network.net);

const loader = new GLTFLoader();
loader.load(block1, function(gltf) {
  const block1 = gltf.scene;
  const s = 5;
  block1.scale.set(s, s, s);

  // placeBuildings(road_polygon, block1)
  placeGridBuildings(road_polygon, block1)

}, undefined, function(error) {
  console.error(error);
});

function placeGridBuildings(road_polygon, block) {
  const holes = road_polygon.slice(1);

  const bb = new three.Box3();
  bb.setFromObject(block);
  const model_width = bb.max.x - bb.min.x;
  const model_height = bb.max.y - bb.min.y;
  const model_depth = bb.max.z - bb.min.z;

  _.forEach(holes, hole => {
    const cells = grid(clipper, hole);

    const group = new three.Group;
    for (let x = 0; x < cells.length; x++) {
      for (let y = 0; y < cells[0].length; y++) {
        const poly = cells[x][y];
        if (poly == null) continue;

        const levels = getRandomInt(1, 4);
        for (let l = 0; l < levels; l++) {
            const cube = block.clone();

            // cube.position.add(new three.Vector3(x * model_width, l * model_height, y * model_depth));
            cube.position.add(new three.Vector3(
              poly[0][0],
              l * model_height,
              poly[0][1],
            ))

            cube.position.add(new three.Vector3(0, model_height / 2, 0));
            group.add(cube);
        }
      }
    }
    scene.add(group);
  })
}

function placeBuildings(road_polygon, block) {
  const holes = road_polygon.slice(1);

  // TODO: use GPU instancing
  // We need some extra loading code, because the imported model is a three.Group()
  // so we need an three.InstancedMesh for each three.Mesh() in the group (which might
  // need to be found recursively).
  // const building_count = holes.length * 15;
  // const instancedMesh = new three.InstancedMesh(block.geometry, block.material, building_count);
  // const dummyObject = new three.Object3D();

  let points = [];
  for (let i = 0; i < holes.length; i++) {
    points.push(...getPositionsAlongPolygon(holes[i]));
    points.push(...getPositionsAlongPolygon(holes[i], 25, 10));
    points.push(...getPositionsAlongPolygon(holes[i], 35, 5));
  }

  const bb = new three.Box3();
  bb.setFromObject(block);
  const model_height = bb.max.y - bb.min.y;

  _.forEach(points, point => {
    const levels = getRandomInt(1, 6);
    for (let l = 0; l < levels; l++) {
      const cube = block.clone();
      cube.position.add(new three.Vector3(point.x, l * model_height, point.y));
      cube.position.add(new three.Vector3(0, model_height / 2, 0));
      scene.add(cube);
    }

    // TODO: use GPU instancing
    // dummyObject.position.x = p.x;
    // dummyObject.position.z = p.y;
    // dummyObject.scale.set(10, 10, 10);
    // instancedMesh.setMatrixAt(i + j, dummyObject.matrix);
  })

  // TODO: use GPU instancing
  // scene.add(instancedMesh);
}

function getPositionsAlongPolygon(polygon, offset=10, count=15) { 
  let r = fromClipper(offsetPolygon(clipper, toClipper(polygon), -offset * SCALE));

  // close the polygon
  r.push(r[0]);

  const shape = new three.Shape(r.map(p => new three.Vector2(p[0], p[1])));
  return shape.getSpacedPoints(count);
}


function animate() {
  requestAnimationFrame(animate);

  // synchronize movement and zooming controllers
  let target = new three.Vector3();
  target = controls_move.target;
  controls_zoom.target.set(target.x, target.y, target.z);

  controls_zoom.update();
  controls_move.update()

  saveCameraLocation();

  renderer.render(scene, camera);
}
animate();

}

mainAsync();
