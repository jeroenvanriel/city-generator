import * as three from 'three';
import { RowhouseGeometry } from './rowhouseGeometry';
import { RowhouseRoofGeometry } from './rowhouseRoofGeometry.js';
import { offsetPolygon, extrudeLine, toClipper, fromClipper, SCALE, getRandomInt, asVector2List, distance, fromVector2toVector3List, cleanLine, between } from './utils';

import { brickMaterial, red, roofMaterial, woodMaterial } from './material.js';
import { PathPlaneGeometry } from './PathPlaneGeometry';

import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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

      drawDoors(scene, r.door, left);
    }
  }

}

/**
 * Get parts of a polygon with consecutively long enough, larger than
 * threshold, edges. The maximum number of edges parameter may for
 * example be used to obtain only single edges.
 */
function getSegments(row, threshold=5, maxEdges=1) {
  let segments = [];
  // current consecutive
  let currentSegment = [row[0]];
  for (let i = 1; i < row.length; i++) {

    // distance to previous point
    const dist = new three.Vector2(row[i][0], row[i][1]).distanceTo(
      new three.Vector2(row[i - 1][0], row[i - 1][1])
    )

    if (dist > threshold) {
      currentSegment.push(row[i])
    }

    if (dist <= threshold || currentSegment.length > maxEdges) {
      if (currentSegment.length >= 2) {
        segments.push(currentSegment);
      }
      currentSegment = [row[i]];
    }
  }
  // also add the last consecutive segment
  if (currentSegment.length >= 2) {
    segments.push(currentSegment)
  }

  return segments;
}

/**
 * Given an extruded line by two boundary lines [p1, ..., pn] and [q1, ..., qn],
 * compute cross lines [(r1,s1), ..., (rm,sm)] for each edge that do not `span across corners`.
 * TODO: Document this definition in the final report.
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

function buildHouse(scene, basePolygon, houseMidline, houseHeight, roofHeight) {
  basePolygon = asVector2List(basePolygon);
  houseMidline = asVector2List(houseMidline);

  // close the polygon if necessary
  if (!basePolygon.at(-1).equals(basePolygon[0])) {
    basePolygon.push(basePolygon[0]);
  }

  const geometry = new RowhouseGeometry(basePolygon, houseHeight);
  const mesh = new three.Mesh(geometry, brickMaterial);
  mesh.castShadow = true;
  scene.add( mesh );

  const roofGeometry = new RowhouseRoofGeometry(basePolygon, houseMidline, roofHeight);
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

function drawDoors(scene, door, points) {
  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i];
    const q = points[i+1]
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
}
