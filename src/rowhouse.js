import * as three from 'three';
import { RowhouseGeometry } from './rowhouseGeometry';
import { RowhouseRoofGeometry } from './rowhouseRoofGeometry.js';
import { offsetPolygon, extrudeLine, toClipper, fromClipper, SCALE, getRandomInt, asVector2List, drawSphere, distance, fromVector2toVector3List } from './utils';

import { brickMaterial, red, roofMaterial, woodMaterial } from './material.js';
import { PathPlaneGeometry } from './PathPlaneGeometry';

export function buildRowHouses(scene, clipper, r, hole) {
  const houseOffset = 15;

  // get row house segments (polylines)
  const innerPolygon = fromClipper(offsetPolygon(clipper, toClipper(hole), - (houseOffset) * SCALE));
  const segments = getSegments(innerPolygon);
  const houseLines = cutSegments(segments)

  for (const line of houseLines) {
    const houseDepth = getRandomInt(8, 10);
    const houseEndDepth = 5;

    const [left, right] = extrudeLine(line, houseDepth, houseEndDepth);
    const basePolygon = [...left, ...right.slice().reverse()];
    buildHouse(scene, basePolygon, line);

    const gardenLine = extrudeLine(right, 15)[1];
    const streetsidePoints = separateHouse(left, gardenLine)[0];
    drawDoors(scene, r.door, streetsidePoints)

    const [pPoints, qPoints] = separateHouse(right, gardenLine);
    drawFence(scene, [qPoints[0], ...gardenLine.slice(1, gardenLine.length - 1), qPoints[qPoints.length - 1]], red);
    for (const [p, q] of _.zip(pPoints, qPoints)) {
      drawFence(scene, [p, q], red);
    }
  }
}

/**
 * Get parts of a polygon with consecutively long enough,
 * larger than threshold, edges.
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

function cutSegments(segments) {
  const MAX_CUTS = 2;
  const lines = [];

  for (const segment of segments) {
    let currentLine = [segment[0]];

    for (let i = 1; i < segment.length; i++) {
      const cutsCount = getRandomInt(0, MAX_CUTS);

      if (cutsCount == 0) {
        currentLine.push(segment[i]);
        continue;
      }

      const line = new three.LineCurve(
        new three.Vector2(segment[i-1][0], segment[i-1][1]),
        new three.Vector2(segment[i][0], segment[i][1]),
      );
      const tangent = line.getTangent(0.5); // t does not matter for lines
      // divisions = cuts + 1
      const cuts = line.getSpacedPoints(cutsCount + 1).slice(1, cutsCount + 1);

      for (const cut of cuts) {
        // cut the line here
        const p = cut.clone();
        p.addScaledVector(tangent, -10);
        currentLine.push([p.x, p.y]);

        lines.push(currentLine);

        currentLine = [[cut.x, cut.y]];
      }

      currentLine.push(segment[i]);
    }

    if (currentLine.length >= 2) {
      lines.push(currentLine);
    }
  }

  return lines;
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
