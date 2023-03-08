import * as three from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MapControls, OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';
import './style.css';

import { loadNetwork, offsetPolygon } from './network.js';
import blocks from './blocks';
import building from './merge';
import { getRandomInt, polygonToMesh } from './utils';

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

camera.position.set(-50, 200, -50)
controls_move.target.set(150, 0, -100);
controls_move.update()

const scene = new three.Scene();

const light = new three.AmbientLight(0x404040);
scene.add(light);

const directionalLight = new three.DirectionalLight(0xffffff, 0.5);
scene.add(directionalLight);


import network from './networks/grid.net.xml';

loadNetwork(network.net).then(r => {
  const [ road_polygon, side_line_polygons, between_line_polygons ] = r;

  const road_material = new three.MeshStandardMaterial( { color: 0x111111 } );
  const road_mesh = polygonToMesh(road_polygon, road_material);
  road_mesh.translateZ(0.02); // to prevent "intersection" with lines
  scene.add(road_mesh);

  const line_material = new three.MeshStandardMaterial( { color: 0xffffff } );
  side_line_polygons.map(p => scene.add(polygonToMesh(p, line_material)));
  // TODO: make these dashed
  between_line_polygons.map(p => scene.add(polygonToMesh(p, line_material)));

  placeBuildings(road_polygon)
})

function placeBuildings(road_polygon) {
  const holes = road_polygon.slice(1);
  const hole = holes[1];

  _.forEach(holes, hole => {
    // build on the first hole
    offsetPolygon(hole, -10).then(r => {

      // close the polygon
      r.push(r[0])

      const shape = new three.Shape(r.map(p => new three.Vector2(p[0], p[1])));

      const box_material = new three.MeshStandardMaterial( { color: 0xffffff } );
      const box_geometry = new three.BoxGeometry( 10, 10, 10 );

      const points = shape.getSpacedPoints(15);
      points.map(p => {
        const cube = new three.Mesh( box_geometry, box_material );
        cube.position.add(new three.Vector3(p.x, 0, p.y));
        cube.position.add(new three.Vector3(0, 5, 0));
        scene.add(cube);
      })

      const shape_geo = new three.ShapeGeometry(shape);
      const mesh = new three.Mesh(shape_geo, material);
      mesh.rotation.set(Math.PI / 2, 0, 0);
      scene.add(mesh)
    })
  })
}

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

  // synchronize movement and zooming controllers
  let target = new three.Vector3();
  target = controls_move.target;
  controls_zoom.target.set(target.x, target.y, target.z);

  controls_zoom.update();
  controls_move.update()

  renderer.render(scene, camera);
}
animate();
