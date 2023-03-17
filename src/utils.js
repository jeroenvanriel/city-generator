import * as three from 'three';
import * as clipperLib from 'js-angusj-clipper/web';

// clipper uses integer numbers, so we multiply
export const SCALE = 1000;

export function toClipper(points) {
  return _.map(points, (point) => ({
    x: Math.round(SCALE * point[0]),
    y: Math.round(SCALE * point[1]),
  }));
}

export function fromClipper(points) {
  return _.map(points, (point) => [
    point.x / SCALE,
    point.y / SCALE,
  ]);
}

/** Generate a random integer between min and max. */
export function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Generate a random uniform number between min and max.  */
export function randomUniform(min, max) {
  return Math.random() * (max - min) + min;
}

/** Use Central Limit Theorem (CLT) with sample size 6 to efficiently approximate Gaussian. */
export function gaussianRand() {
  var rand = 0;

  for (var i = 0; i < 6; i += 1) {
    rand += Math.random();
  }

  return rand / 6;
}

/** Sample approximately Gaussian distributed samples in (start, end).  */
export function gaussianRandom(start, end) {
  return Math.floor(start + gaussianRand() * (end - start + 1));
}

/** Generate three.Shape from polygon, given as a list [outer, hole, hole, ..., hole].  */
export function polygonToShape(polygon, closed=false) {
  let outer = [];
  let holes = [];

  // first one is the outer boundary
  outer = asVector2List(polygon[0]);

  // the rest of the polygons define the holes
  _.forEach(polygon.slice(1), hole => {
    const points = asVector2List(hole);
    const path = new three.Path(points);
    holes.push(path);
  });

  const shape = new three.Shape(outer);
  if (closed) shape.closePath();
  shape.holes = holes;

  return shape;
}

/** Generate flat 3d mesh from polygon, given as a list [outer, hole, hole, ..., hole]. */
export function polygonToMesh(polygon, material) {
  const shape = polygonToShape(polygon);
  
  const geometry = new three.ShapeGeometry(shape);
  material.side = three.DoubleSide;
  const mesh = new three.Mesh(geometry, material);
  mesh.rotation.set(Math.PI / 2, 0, 0);
  return mesh;
}

/** Draw little sphere at exact location (for debugging). */
export function drawSphere(scene, point, params) {
  const defaults = { size: 1, color: 'green' };
  params = Object.assign(defaults, params);

  const geometry = new three.SphereGeometry(params.size, 10, 10);
  const material = new three.MeshStandardMaterial({ color: params.color });
  const mesh = new three.Mesh(geometry, material);
  if (!point.z) { // Vector2
    mesh.position.set(point.x, 0, point.y)
  } else { // Vector3
    mesh.position.copy(point);
  }
  scene.add(mesh);
}

/** Robust calculation of intersection of lines p1-p2 and p3-p4. */
export function intersectionLines(p1, p2, p3, p4) {
  const x = (p1.x * p2.y - p1.y * p2.x)*(p3.x - p4.x) - (p1.x - p2.x)*(p3.x*p4.y - p3.y*p4.x);
  const xd = (p1.x - p2.x)*(p3.y - p4.y) - (p1.y - p2.y)*(p3.x - p4.x);

  const y = (p1.x * p2.y - p1.y * p2.x)*(p3.y - p4.y) - (p1.y - p2.y)*(p3.x*p4.y - p3.y*p4.x);
  const yd = (p1.x - p2.x)*(p3.y - p4.y) - (p1.y - p2.y)*(p3.x - p4.x);

  // TODO: parallel/coincident check

  return new three.Vector2(x/xd, y/yd);
}

/** Takes list of three.Vector2 and outputs three.Shape. */
export function extrudeLine(line, offset=5) {
  line = asVector2List(line);
  const origin = new three.Vector2();

  function offsetLine(p, q) {
    const v = new three.Vector2().subVectors(q, p);
    v.rotateAround(origin, -Math.PI / 2);
    v.normalize().multiplyScalar(offset);
    return v;
  }

  // boundary points
  const left = [];
  const right = [];

  let p, q, v, r1, s1, r2, s2, m1, n1, m2, n2;
  for (let i = 0; i < line.length - 1; i++) {
    p = line[i];
    q = line[i + 1];

    v = offsetLine(p, q);
    r1 = new three.Vector2().addVectors(p, v);
    s1 = new three.Vector2().addVectors(q, v);
    v.multiplyScalar(-1); // flip for other side
    r2 = new three.Vector2().addVectors(p, v);
    s2 = new three.Vector2().addVectors(q, v);

    if (i == 0) {
      left.push(r1);
      right.push(r2);
    } else {
      // compute intersection of lines m-n, r-s
      const x1 = intersectionLines(m1, n1, r1, s1);
      const x2 = intersectionLines(m2, n2, r2, s2);
      left.push(x1);
      right.push(x2);
    }
    m1 = r1; n1 = s1;
    m2 = r2; n2 = s2;
  }
  left.push(s1)
  right.push(s2)

  return [...left, ...right.reverse()];
}

/** May be regarded an idempotent operator. */
export function asVector2List(polygon) {
  if (polygon[0].x && polygon[0].y) return polygon;
  return polygon.map(p => new three.Vector2(p[0], p[1]));
}

export function union(clipper, polygons) {
  const inputs = _.map(polygons, (polygon) => ({ data: polygon, closed: true }));
  return clipper.clipToPaths({
    clipType: clipperLib.ClipType.Union,
    subjectInputs: inputs,
    subjectFillType: clipperLib.PolyFillType.Positive
  });
}

export function extrudePolyline(clipper, line, delta=2) {
  return clipper.offsetToPaths({
    delta: delta,
    offsetInputs: [{
      data: line,
      joinType: clipperLib.JoinType.Square,
      endType: clipperLib.EndType.OpenButt
    }],
  })[0];
}

export function offsetPolygon(clipper, polygon, delta=2) {
  return clipper.offsetToPolyTree({
    delta: delta,
    offsetInputs: [{
      data: polygon,
      joinType: clipperLib.JoinType.Round,
      endType: clipperLib.EndType.ClosedPolygon,
    }],
  })?.getFirst()?.contour;
}

export function intersection(clipper, poly1, poly2) {
  const in1 = { data: poly1, closed: true };
  const in2 = { data: poly2, closed: true };
  return clipper.clipToPaths({
    clipType: clipperLib.ClipType.Intersection,
    subjectInputs: [in1],
    clipInputs: [in2],
    subjectFillType: clipperLib.PolyFillType.Positive
  });
}

export function difference(clipper, poly1, poly2) {
  const in1 = { data: poly1, closed: true };
  const in2 = { data: poly2, closed: true };
  return clipper.clipToPaths({
    clipType: clipperLib.ClipType.Difference,
    subjectInputs: [in1],
    clipInputs: [in2],
    subjectFillType: clipperLib.PolyFillType.NonZero
  });
}

/* TODO: For creating dashed line between lanes. */
function lineToMesh(line_polygon) {
  const points = _.map(line, (point) => new three.Vector2( point[0], point[1] ));
  points.push(points[0]); // close the shape

  // TODO: enable spaced line parts, maybe using `getSpacedPoints()`
  // const shape = new three.Shape(points);
  // shape.autoClose = true;
  // const points = shape.getPoints();
  // const spacedPoints = shape.getSpacedPoints( 50 );

  const geometryPoints = new three.BufferGeometry().setFromPoints( points );
  // const geometrySpacedPoints = new three.BufferGeometry().setFromPoints( spacedPoints );

  const material = new three.LineBasicMaterial({ color: new three.Color(0, 0, 1) });
  const mesh = new three.Line(geometryPoints, material);
  mesh.position.set(0, 0.05, 0);
  mesh.rotation.set(Math.PI / 2, 0, 0);
  return mesh;
}

/* TODO: For debugging the network loader. */
function drawPolygon(points, params) {
  const defaults = { closed: true, color: 'black', fill: 'none', markers: false };
  params = Object.assign(defaults, params);

  const func = params.closed ? 'polygon' : 'polyline';
  const line = draw[func](points)
    .translate(750, 750)
    .scale(6, 0, 0)
    .fill(params.fill)
    .stroke({ width: 0.2, color: params.color });

  const marker = draw.marker(5, 5, function(add) {
    add.circle(5, 5).fill({ color: params.color }).stroke({ color: params.color });
  });
  if (params.markers) ['start', 'mid', 'end'].map(t => line.marker(t, marker))
}
