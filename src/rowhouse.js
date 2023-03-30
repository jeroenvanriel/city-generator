import * as three from 'three';
import { RowhouseGeometry } from './rowhouseGeometry';
import { RowhouseRoofGeometry } from './rowhouseRoofGeometry.js';
import { offsetPolygon, extrudeLine, toClipper, fromClipper, SCALE, getRandomInt, asVector2List, distance, fromVector2toVector3List, cleanLine, polygonToMesh, midpoint } from './utils';

import { brickMaterial, red, roofMaterial, woodMaterial } from './material.js';
import { PathPlaneGeometry } from './PathPlaneGeometry';

export function buildRowHouses(scene, clipper, r, hole) {
  const houseOffset = 15;

  // get row house segments (polylines)
  const innerPolygon = fromClipper(offsetPolygon(clipper, toClipper(hole), - (houseOffset) * SCALE));
  innerPolygon.push(innerPolygon[0]); // close it
  const segments = getSegments(innerPolygon);

  for (let segment of segments) {
    const houseDepth = getRandomInt(8, 10);
    const houseEndDepth = 5;
    const margin = 15;

    segment = extendLine(segment, -margin);

    const [left, right] = extrudeLine(segment, houseDepth);
    const houses = splitSegment(left, right, segment)

    for (const house of houses) {
      const [polygon, midline] = house;
      buildHouse(scene, polygon, midline);
    }
  }

  // const gardenLine = extrudeLine(right, 15)[1];
  // const streetsidePoints = splitPolygon(left, gardenLine)[0];
  // drawDoors(scene, r.door, streetsidePoints);

  // const [leftGarden, rightGarden] = splitPolygon(right, gardenLine);
  // drawFences(scene, leftGarden, rightGarden, woodMaterial);
}

/**
 * Get parts of a polygon with consecutively long enough,
 * larger than threshold, edges.
 * TODO: Add option to set maximum number of edges (e.g. to obtain only edges).
 */
function getSegments(row, threshold=5) {
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
    } else {
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
function splitSegment(p, q, m) {
  // obtain a list of splits for each edge
  const edgeSplits = splitPolygon(p, q);

  // each house is represented as [polygon, midline]
  let houses = [];
  function addHouse(current) {
    const [rs, midline, ss] = _.unzip(current);
    const polygon = [...rs, ...ss.reverse()];
    houses.push([polygon, midline]);
  }

  // list of triples (p, m, q)
  let current = [];
  for (let i = 0; i < edgeSplits.length; i++) {
    // add start of i'th edge
    current.push([p[i], m[i], q[i]])
    for (const [r, s] of edgeSplits[i]) {
      // compute the midpoint between r and s
      // to obtain the midline point
      // const [r, s] = split;
      const m = midpoint(r, s);
      current.push([r, m, s]);
      addHouse(current);

      // start again from current split
      current = [[r, m, s]];
    }
  }

  // add end of last edge
  current.push([p[p.length - 1], m[m.length - 1], q[q.length - 1]]);
  addHouse(current);

  return houses;
}

/** Extend the first and last edge of a line [p1, ..., pn]. */
function extendLine(line, offset) {
  let v, n = line.length;
  line = asVector2List(line);
  // begin
  v = new three.Vector2().subVectors(line[0], line[1]).normalize();
  line[0].addScaledVector(v, offset);
  // end
  v = new three.Vector2().subVectors(line[n - 1], line[n - 2]).normalize();
  line[n - 1].addScaledVector(v, offset);
  return line;
}

function buildHouse(scene, basePolygon, houseMidline) {
  basePolygon = asVector2List(basePolygon);
  houseMidline = asVector2List(houseMidline);

  // close the polygon if necessary
  if (!basePolygon.at(-1).equals(basePolygon[0])) {
    basePolygon.push(basePolygon[0]);
  }

  const houseHeight = getRandomInt(8, 20);
  const roofHeight = getRandomInt(4, 15);

  const geometry = new RowhouseGeometry(basePolygon, houseHeight);
  const mesh = new three.Mesh(geometry, brickMaterial);
  mesh.castShadow = true;
  scene.add( mesh );

  const roofGeometry = new RowhouseRoofGeometry(basePolygon, houseMidline, roofHeight);
  const roofMesh = new three.Mesh(roofGeometry, roofMaterial);
  roofMesh.translateY(houseHeight);
  scene.add(roofMesh);
}

/**
 * Given an extruded line by two boundary lines [p1, ..., pn] and [q1, ..., qn],
 * compute cross lines [(r1,s1), ..., (rm,sm)] that do not `span across corners`.
 * TODO: Document this definition in the final report.
 */
function separateHouse(p, q, offset=5, minStep=25) {
  const n = p.length;

  const r = [];
  const s = [];

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
    const length = distance(startp, endp);
    const steps = Math.floor(length / minStep);
    const step = (length - 2 * offset) / steps;
    for (let j = 0; j <= steps; j++) {
      r.push(startp.clone().addScaledVector(v, offset + j * step));
      s.push(startq.clone().addScaledVector(v, offset + j * step));
    }
  }

  return [r, s];
}

function drawFence(scene, points, material, height=5, depth=0.5) {
  const n = points.length;

  // extrude inwards (so we don't use `right`)
  const [left, right] = extrudeLine(points, depth / 2);
  const polygon = [...points, ...left.reverse()];
  polygon.push(polygon[0]); // close it

  // duplicate points and move up
  const upperPolygon = fromVector2toVector3List(polygon).map(p => 
    new three.Vector3().copy(p).setY(p.y + height)
  )

  const geometry = new PathPlaneGeometry(fromVector2toVector3List(polygon), upperPolygon);
  const mesh = new three.Mesh(geometry, material);
  scene.add(mesh);

  const topGeometry = new PathPlaneGeometry(upperPolygon.slice(0, n), upperPolygon.slice(n, 2*n).reverse())
  const topMesh = new three.Mesh(topGeometry, material);
  scene.add(topMesh);
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
