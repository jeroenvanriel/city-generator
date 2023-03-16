import * as three from 'three';
import { RowhouseGeometry } from './rowhouseGeometry';
import { RowhouseRoofGeometry } from './rowhouseRoofGeometry.js';
import { polygonToMesh, offsetPolygon, toClipper, fromClipper, SCALE, extrudePolyline, asVector2List } from './utils';

import { red, blue } from './material.js';

export function buildRowHouses(scene, clipper, hole) {
  const sidewalkWidth = 5;
  const houseOffset = 15;
  const houseDepth = 8;

  const sidewalkInner = fromClipper(offsetPolygon(clipper, toClipper(hole), - sidewalkWidth * SCALE));

  // draw sidewalks
  scene.add(polygonToMesh([hole, sidewalkInner], red));

  const houseMidlineClipper = offsetPolygon(clipper, toClipper(hole), - (houseOffset) * SCALE);
  const basePolygon = fromClipper(extrudePolyline(clipper, houseMidlineClipper, houseDepth * SCALE));
  basePolygon.push(basePolygon[0]); // close it

  buildHouse(scene,
    asVector2List(basePolygon),
    asVector2List(fromClipper(houseMidlineClipper))
  )
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
