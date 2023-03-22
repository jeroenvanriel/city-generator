import * as three from 'three';

import { loadNetwork, getBounds } from './network.js';
import { addEnvironment } from './environment';
import { grid } from './grid'
import { buildRowHouses } from './rowhouse.js';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getRandomInt, polygonToMesh, offsetPolygon, toClipper, fromClipper, SCALE, polygonToShape, getRandomSubarray, sampleFromImage } from './utils';

import network from './networks/real2.net.xml';
import block1 from './models/block1.glb';
import block_grey from './models/block_grey.glb';
import streetlamp from './models/street_lamp.glb';
import tree from './models/tree1.glb';

import { roadMaterial, concreteMaterial, densityTexture } from './material';


const OBJECTS = {
  'block1': { url: block1, scale: 10 },
  'block_grey': { url: block_grey, scale: 10 },
  'streetlamp': { url: streetlamp, scale: 0.015 },
  'tree': { url: tree, scale: 3.5 },
}

export function build(scene, clipper) {
    addEnvironment(scene, network.net);

    const [ road_polygon, side_line_polygons, between_line_polygons ] = loadNetwork(network.net, clipper)
    drawRoad(scene, road_polygon, side_line_polygons, between_line_polygons);
    
    const holes = road_polygon.slice(1);

    const sidewalkWidth = 5;
    const businessHoles = getRandomSubarray(holes, 5);

    loadObjects(OBJECTS).then(r => {
      placeStreetlamps(clipper, scene, road_polygon, r.streetlamp);

      placeFromImage(scene, getBounds(network.net), densityTexture.image, r.tree)

      _.forEach(holes, hole => {
        const sidewalkInner = fromClipper(offsetPolygon(clipper, toClipper(hole), - sidewalkWidth * SCALE));

        // draw sidewalks
        scene.add(polygonToMesh([hole, sidewalkInner], concreteMaterial));

        if (businessHoles.includes(hole)) {
          placeGridBuildings(clipper, scene, sidewalkInner, r.block_grey);
        }
        else {
          buildRowHouses(scene, clipper, hole);
        }
      })
    });
}

function loadObjects(objects) {
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {

    const promises = Object.entries(objects).map(([key, object]) =>
      new Promise((resolve, reject) => {

        // add the loaded mesh as property
        loader.loadAsync(object.url).then(obj => {
          object.obj = obj
          resolve([key, object]);
        }).catch(error => reject(error))

      })); 

    // wait for all objects to load
    Promise.all(promises).then(loadedObjects => {
      const bb = new three.Box3();

      _.forEach(loadedObjects, ([key, object]) => {
        const obj = object.obj.scene;
        const s = object.scale;
        obj.scale.set(s, s, s);

        // compute bounding box dimensions
        bb.setFromObject(obj);
        object.model_width = bb.max.x - bb.min.x;
        object.model_height = bb.max.y - bb.min.y;
        object.model_depth = bb.max.z - bb.min.z;
      })

      resolve(Object.fromEntries(loadedObjects));
    }).catch(error => reject(error));

  })
}

function drawRoad(scene, road_polygon, side_line_polygons, between_line_polygons) {
    const road_mesh = polygonToMesh(road_polygon, roadMaterial);
    scene.add(road_mesh);

    const line_material = new three.MeshStandardMaterial( { color: 0xffffff } );
    const side_lines = side_line_polygons.map(p => polygonToMesh(p, line_material));
    _.forEach(side_lines, line => {
      line.translateZ(-0.01); // to prevent intersection
      scene.add(line);
    });

    // TODO: make these dashed
    const between_lines = between_line_polygons.map(p => polygonToMesh(p, line_material));
    _.forEach(between_lines, line => {
      line.translateZ(-0.01); // to prevent intersection
      scene.add(line);
    });
}

function placeGridBuildings(clipper, scene, hole, block) {
  const cells = grid(clipper, hole, block.model_width, block.model_depth);

  const group = new three.Group;
  for (let x = 0; x < cells.length; x++) {
    for (let y = 0; y < cells[0].length; y++) {
      const poly = cells[x][y];
      if (poly == null) continue;

      const levels = getRandomInt(1, 4);
      for (let l = 0; l < levels; l++) {
        const cube = block.obj.scene.clone();
        // TODO: traverse children
        _.forEach(cube.children[0].children, child => { child.castShadow = true });

        // TODO: fix (i.e., center) the exact grid position w.r.t. to hole polygon
        cube.position.add(new three.Vector3(
          poly[0][0] + block.model_height / 2,
          l * block.model_height,
          poly[0][1] + block.model_depth / 2,
        ))

        // TODO: fix this in the block model itself
        cube.position.add(new three.Vector3(0, block.model_height / 2, 0));
        group.add(cube);
      }
    }
  }
  scene.add(group);
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

function placeStreetlamps(clipper, scene, road_polygon, streetlamp) {
  const holes = road_polygon.slice(1);
  let points = [];
  for (let i = 0; i < holes.length; i++) {
    points.push(...getPositionsAlongPolygon(clipper, holes[i], 2, 12));
  }

  _.forEach(points, point => {
      const lamp = streetlamp.obj.scene.clone();
      lamp.position.add(new three.Vector3(point.x, streetlamp.model_height/2, point.y));
      //const lamp_light = new three.PointLight(0xffff66, 1, 5);
      //lamp_light.position.add(new three.Vector3(point.x, model_height, point.y))
      scene.add(lamp);
    })
}

function getPositionsAlongPolygon(clipper, polygon, offset=10, count=15) { 
  let r = fromClipper(offsetPolygon(clipper, toClipper(polygon), -offset * SCALE));

  // close the polygon
  r.push(r[0]);

  const shape = polygonToShape([r]);
  return shape.getSpacedPoints(count);
}

function placeFromImage(scene, bounds, image, object, N=1000) {
  const [left, bottom, right, top] = bounds;

  // TODO: traverse all children independent of the model
  const tree = object.obj.scene.children[0];
  const leaves = object.obj.scene.children[1];
  const meshes = [
    new three.InstancedMesh(tree.geometry, tree.material, N),
    new three.InstancedMesh(leaves.geometry, leaves.material, N)
  ];
  const dummy = new three.Object3D();

  const points = sampleFromImage(image, N);

  for (let i = 0; i < points.length; i++) {
    dummy.position.set(
      points[i][0] / image.width * (right - left),
      0,
      points[i][1] / image.height * (top - bottom)
    );
    dummy.updateMatrix();
    _.forEach(meshes, mesh => mesh.setMatrixAt(i, dummy.matrix))
  }

  const mesh = new three.Group();
  mesh.add(...meshes);
  scene.add(mesh);
}
