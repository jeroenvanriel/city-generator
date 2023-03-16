import * as three from 'three';
import { RowhouseGeometry } from './rowhouseGeometry';
import { RowhouseRoofGeometry } from './rowhouseRoofGeometry.js';
import { polygonToMesh, offsetPolygon, toClipper, fromClipper, SCALE, extrudePolyline, asVector2List, polygonToShape, randomUniform, getRandomInt } from './utils';

import { red, blue } from './material.js';

export function buildRowHouses(scene, clipper, hole) {
  const sidewalkWidth = 5;
  const houseOffset = 15;
  const houseDepth = 8;

  const sidewalkInner = fromClipper(offsetPolygon(clipper, toClipper(hole), - sidewalkWidth * SCALE));

  // draw sidewalks
  scene.add(polygonToMesh([hole, sidewalkInner], red));

  // get row house segments (polylines)
  const innerPolygon = fromClipper(offsetPolygon(clipper, toClipper(hole), - (houseOffset) * SCALE));
  const segments = getSegments(innerPolygon);
  const houseLines = cutSegments(segments)

  for (const segment of houseLines) {
    const basePolygon = fromClipper(extrudePolyline(clipper, toClipper(segment), houseDepth * SCALE));
    basePolygon.push(basePolygon[0]); // close it

    buildHouse(scene,
      asVector2List(basePolygon),
      asVector2List(segment)
    )
  }
}

function getSegments(row) {
  const THRESHOLD = 5;

  let segments = [];
  // current consecutive
  let currentSegment = [row[0]];
  for (let i = 1; i < row.length; i++) {

    const dist = new three.Vector2(row[i][0], row[i][1]).distanceTo(
      new three.Vector2(row[i - 1][0], row[i - 1][1])
    )

    if (dist > THRESHOLD) {
      currentSegment.push(row[i])
    } else {
      if (currentSegment.length >= 2) {
        segments.push(currentSegment);
      }
      currentSegment = [];
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

function buildHouse(scene, basePoints, houseMidline) {
  const houseHeight = 10;
  const roofHeight = 5;

  const geometry = new RowhouseGeometry(basePoints, houseHeight);
  const mesh = new three.Mesh(geometry, blue);
  scene.add( mesh );

  const roofGeometry = new RowhouseRoofGeometry(basePoints, houseMidline, roofHeight);
  const roofMesh = new three.Mesh(roofGeometry, red);
  roofMesh.translateY(houseHeight);
  scene.add(roofMesh);
}
