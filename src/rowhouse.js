import * as three from 'three';
import { RowhouseGeometry } from './geometry/RowhouseGeometry';
import { offsetPolygon, extrudeLine, toClipper, fromClipper, SCALE, getRandomInt, asVector2List, distance, fromVector2toVector3List, cleanLine, between, getSegments } from './utils';

import { brickMaterial, red, roofMaterial, woodMaterial } from './material.js';
import { PathPlaneGeometry } from './geometry/PathPlaneGeometry';

import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { StraightSkeletonRoofGeometry } from './geometry/StraightSkeletonRoofGeometry';

export function buildRowHouses(scene, clipper, r, hole) {
  const houseOffset = 25;

  // get row house segments (polylines)
  const innerPolygon = fromClipper(offsetPolygon(clipper, toClipper(hole), - (houseOffset) * SCALE));
  innerPolygon.push(innerPolygon[0]); // close it
  const segments = getSegments(innerPolygon);

  for (let segment of segments) {
    const houseDepth = getRandomInt(8, 10);
    const gardenDepth = getRandomInt(10, 12);
    const totalDepth = houseDepth + gardenDepth;

    const segmentPadding = 15;
    segment = extendLine(segment, -segmentPadding);

    const [left, right] = extrudeLine(segment, houseDepth + gardenDepth);
    const houses = splitSegment(left, right, [houseDepth / totalDepth / 2, houseDepth / totalDepth]);

    let houseHeight = getRandomInt(8, 20);
    let roofHeight = getRandomInt(4, 15);

    for (const house of houses) {
      let padding = 0;
      let roofPadding = 0;
      const paddingRate = 0.4;
      if (Math.random() < paddingRate) {
        padding = getRandomInt(8, 10);
        roofPadding = padding + 5;
        // new house, so new sample
        houseHeight = getRandomInt(8, 20);
        roofHeight = getRandomInt(4, 15);
      }

      const left = extendLine(house[0], -padding);
      const midline = extendLine(house[1], -roofPadding)
      const right = extendLine(house[2], -padding);
      const garden = extendLine(house[3], -padding);

      const polygon = [...left, ...right.slice().reverse()];
      buildHouse(scene, polygon, midline, houseHeight, roofHeight);

      drawFences(scene, right, garden, woodMaterial);

      drawDoors(scene, r.door, left, right);

      drawFrontWindows(scene, r.small_window, r.big_window, left, houseHeight);

      drawBackWindows(scene, r.small_window, r.big_window, right, houseHeight);
    }
  }

}

/**
 * Given an extruded line by two boundary lines [p1, ..., pn] and [q1, ..., qn],
 * compute cross lines [(r1,s1), ..., (rm,sm)] for each edge that do not `span across corners`.
 */
function splitPolygon(p, q, offset=5, minStep=25) {
  const n = p.length;

  const edges = [];

  let v, w1, w2, startoffset, endoffset;
  for (let i = 0; i < n - 1; i++) {
    v = new three.Vector2().subVectors(p[i+1], p[i]).normalize();

    w1 = new three.Vector2().subVectors(q[i], p[i]).dot(v);
    w2 = new three.Vector2().subVectors(q[i+1], p[i+1]).dot(v);

    startoffset = new three.Vector2().addScaledVector(v, Math.max(0, w1));
    endoffset = new three.Vector2().addScaledVector(v, Math.min(0, w2));

    const startp = new three.Vector2().addVectors(p[i], startoffset);
    const endp = new three.Vector2().addVectors(p[i+1], endoffset)

    startoffset = new three.Vector2().addScaledVector(v, Math.min(0, w1));
    endoffset = new three.Vector2().addScaledVector(v, Math.max(0, w2));

    const startq = new three.Vector2().addVectors(q[i], startoffset)
    // const endq = new three.Vector2().addVectors(q[i+1], endoffset)

    // evenly spaced points
    const length = distance(startp, endp) - 2 * offset;
    const parts = Math.floor(length / minStep);
    const step = length / parts;
    const splits = [];
    for (let j = 1; j <= parts - 1; j++) {
      splits.push([
        startp.clone().addScaledVector(v, offset + j * step),
        startq.clone().addScaledVector(v, offset + j * step)
      ]);
    }

    edges.push(splits)
  }

  return edges;
}

/**
 * We assume that line extrusion was symmetric, because we obtain the midline points
 * at the cuts by taking the midpoint between r and s.
 */
function splitSegment(p, q, midlines) {
  // obtain a list of splits for each edge
  const edgeSplits = splitPolygon(p, q);

  // each house is represented as [line, ...midlines, line]
  let houses = [];

  function cut(p, q) {
    const ms = midlines.map(m => between(p, q, m))
    return [p, ...ms, q];
  }

  // list of split points [p, ...midlinePoints, q]
  let current = [];
  for (let i = 0; i < edgeSplits.length; i++) {
    // add start of i'th edge
    current.push(cut(p[i], q[i]))

    for (const [r, s] of edgeSplits[i]) {
      current.push(cut(r, s));
      houses.push(_.unzip(current));

      // start again from current cut
      current = [cut(r, s)];
    }
  }

  // add end of last edge
  current.push(cut(p[p.length - 1], q[q.length - 1]));
  houses.push(_.unzip(current));

  return houses;
}

/** Extend the first and last edge of a line [p1, ..., pn]. */
function extendLine(line, offset) {
  let v, n = line.length;
  const out = asVector2List(line).map(p => p.clone());
  // begin
  v = new three.Vector2().subVectors(out[0], out[1]).normalize();
  out[0].addScaledVector(v, offset);
  // end
  v = new three.Vector2().subVectors(out[n-1], out[n-2]).normalize();
  out[n-1].addScaledVector(v, offset);
  return out;
}

export function buildHouse(scene, basePolygon, houseHeight, roofHeight) {
  basePolygon = asVector2List(basePolygon);

  // close the polygon if necessary
  if (!basePolygon.at(-1).equals(basePolygon[0])) {
    basePolygon.push(basePolygon[0]);
  }

  const geometry = new RowhouseGeometry(basePolygon, houseHeight);
  const mesh = new three.Mesh(geometry, brickMaterial);
  mesh.castShadow = true;
  scene.add( mesh );

  const roofGeometry = new StraightSkeletonRoofGeometry(basePolygon, roofHeight);
  const roofMesh = new three.Mesh(roofGeometry, roofMaterial);
  roofMesh.translateY(houseHeight);
  scene.add(roofMesh);
}

function drawFences(scene, left, right, material, height=5, depth=0.5) {
  function drawFence(points) {
    points = cleanLine(points);
    const n = points.length;

    // extrude inwards (so we don't use `right`)
    const [left, right] = extrudeLine(points, depth / 2);
    const polygon = [...left, ...points.reverse()];
    polygon.push(polygon[0]); // close it

    // duplicate points and move up
    const upperPolygon = fromVector2toVector3List(polygon).map(p => 
      new three.Vector3().copy(p).setY(p.y + height)
    )

    const sideGeometry = new PathPlaneGeometry(fromVector2toVector3List(polygon), upperPolygon);
    const topGeometry = new PathPlaneGeometry(upperPolygon.slice(0, n), upperPolygon.slice(n, 2*n).reverse())

    scene.add(new three.Mesh(mergeBufferGeometries([sideGeometry, topGeometry]), material));
  }

  drawFence(left);
  drawFence(right);
  for (const [p, q] of _.zip(left, right)) {
    drawFence([p, q]);
  }
}

function drawDoors(scene, door, left, right) {
  for (let i = 0; i < left.length - 1; i++) {
    const p = left[i];
    const q = left[i+1];
    const v = new three.Vector2().subVectors(q, p);

    const offset = v.length() / 2;
    const angle = v.angle();
    const pos = new three.Vector2().copy(p).addScaledVector(v.normalize(), offset);

    const obj = door.obj.scene.clone();

    obj.rotateY(Math.PI / 2 - angle);
    obj.position.setX(pos.x);
    obj.position.setZ(pos.y);

    scene.add(obj);
  }

  for (let j = 0; j < right.length - 1; j++) {
    const p = right[j];
    const q = right[j+1];
    const v = new three.Vector2().subVectors(q, p);

    const offset = v.length() / 2;
    const angle = v.angle();
    const pos = new three.Vector2().copy(p).addScaledVector(v.normalize(), offset);

    const objBack = door.obj.scene.clone();

    objBack.rotateY(Math.PI / 2 - angle);
    objBack.position.setX(pos.x);
    objBack.position.setZ(pos.y);

    scene.add(objBack);
  }
}

function drawFrontWindows(scene, small_window, big_window, points, houseHeight) {

  const houseHeightHalf = (houseHeight / 2);
  //threshold to determine if house is high enough for 2 levels of windows
  const houseHeightThreshold = 15;

  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i]; //first x point of house
    const q = points[i+1]; //second x point of house
    const v = new three.Vector2().subVectors(q, p); //groundline x of house

    //amount of windows in the second level
    const windowAmountTop = Math.ceil(v.length() / 14);
    // distance between windows
    const windowDistTop = v.length() / windowAmountTop;

    const angle = v.angle();

    //windows one level above the door if house is high enough
    if (houseHeight > houseHeightThreshold) {
      for (let j = 0; j < windowAmountTop; j++) {

        //need to redo this otherwise v stays normalised in following iterations
        const v = new three.Vector2().subVectors(q, p); 

        //small chance window does not show for variation
        const windowRandTop = getRandomInt(0, 10);
        if (windowRandTop < 9) {
        
          //Here (windowDistTop / 3) otherwise windows start outside of houseborder
          const offset = v.length() - (j*windowDistTop) - (windowDistTop / 3);
          const pos = new three.Vector2().copy(p).addScaledVector(v.normalize(), offset);

          const objTop = small_window.obj.scene.clone();

          objTop.rotateY(Math.PI / 2 - angle);
          objTop.position.setX(pos.x);
          objTop.position.setZ(pos.y);
          objTop.position.setY(houseHeightHalf + 0.5);
          
          scene.add(objTop);
        }
      }
    }

    //Windows on the same level as the door
    const windowAmountBottom = Math.floor((v.length() / 2) / 14);
    
    if (windowAmountBottom > 0) { 
      const windowDistBottom = v.length() / windowAmountBottom;
    
      //Here we look at the left side of the door and the right side of the door separately such that they don't overlap with the door 
      for (let k = 0; k < windowAmountBottom; k++) {

        //need to redo this otherwise v stays normalised in following iterations
        const v = new three.Vector2().subVectors(q, p); 

        //Here (windowDistBottom / 7) otherwise windows start outside of houseborder
        const offsetFirst = v.length() - (k*(windowDistBottom / 2.5)) - (windowDistBottom / 7);
        const offsetSecond = v.length() - (v.length()/2) - (k*(windowDistBottom / 2.5)) - (windowDistBottom / 7);
        const posFirst = new three.Vector2().copy(p).addScaledVector(v.normalize(), offsetFirst);
        const posSecond = new three.Vector2().copy(p).addScaledVector(v.normalize(), offsetSecond);

        const objBottomFirst = big_window.obj.scene.clone();
        const objBottomSecond = big_window.obj.scene.clone();

        objBottomFirst.rotateY(Math.PI / 2 - angle);
        objBottomFirst.position.setX(posFirst.x);
        objBottomFirst.position.setZ(posFirst.y);
        objBottomFirst.position.setY(houseHeightHalf / 4);

        objBottomSecond.rotateY(Math.PI / 2 - angle);
        objBottomSecond.position.setX(posSecond.x);
        objBottomSecond.position.setZ(posSecond.y);
        objBottomSecond.position.setY(houseHeightHalf / 4);
          
        scene.add(objBottomFirst);
        scene.add(objBottomSecond);
      }
    }
  }
}

function drawBackWindows(scene, small_window, big_window, points, houseHeight) {

  const houseHeightHalf = (houseHeight / 2);
  //threshold to determine if house is high enough for 2 levels of windows
  const houseHeightThreshold = 15;

  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i]; //first x point of house
    const q = points[i+1]; //second x point of house
    const v = new three.Vector2().subVectors(q, p); //groundline x of house

    //amount of windows in the second level
    const windowAmountTop = Math.ceil(v.length() / 14);
    // distance between windows
    const windowDistTop = v.length() / windowAmountTop;

    const angle = v.angle();

    //windows one level above the door if house is high enough
    if (houseHeight > houseHeightThreshold) {
      for (let j = 0; j < windowAmountTop; j++) {

        //need to redo this otherwise v stays normalised in following iterations
        const v = new three.Vector2().subVectors(q, p); 

        //small chance window does not show for variation
        const windowRandTop = getRandomInt(0, 10);
        if (windowRandTop < 9) {
        
          //Here (windowDistTop / 3) otherwise windows start outside of houseborder
          const offset = v.length() - (j*windowDistTop) - (windowDistTop / 3);
          const pos = new three.Vector2().copy(p).addScaledVector(v.normalize(), offset);

          const objTop = small_window.obj.scene.clone();

          objTop.rotateY(Math.PI / 2 - angle);
          objTop.position.setX(pos.x);
          objTop.position.setZ(pos.y);
          objTop.position.setY(houseHeightHalf + 0.5);
          
          scene.add(objTop);
        }
      }
    }    
  }
}
