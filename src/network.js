import * as three from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SVG } from '@svgdotjs/svg.js';
import * as clipperLib from 'js-angusj-clipper/web';
import * as _ from 'lodash';

import network from './networks/test.net.xml';
const net = network.net;

// determine the size of the SVG canvas from the 'convBoundary' attribute
// that is found in the <location> tag
const sizes = _.map(net.location[0].$.convBoundary.split(','))
var draw = SVG().addTo('body').size(10 * (sizes[2] - sizes[0]), 10 * (sizes[3] - sizes[1]))

function parseShape(shape) {
  return shape.split(' ').map(coord => coord.split(',').map(Number));
}

// clipper uses integer numbers, so we multiply
const SCALE = 1000;

const EXTRUDE_SCALE = 1.65;
const LINE_OFFSET = 0.08;
const LINE_WIDTH = 0.08;

function toClipper(points) {
  return _.map(points, (point) => ({
    x: Math.round(SCALE * point[0]),
    y: - Math.round(SCALE * point[1]), // SUMO format has flipped y-coordinates
  }));
}

function fromClipper(points) {
  return _.map(points, (point) => [
    point.x / SCALE,
    point.y / SCALE,
  ]);
}

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

export default async function loadNetwork() {

  const clipper = await clipperLib.loadNativeClipperLibInstanceAsync(
    clipperLib.NativeClipperLibRequestedFormat.WasmWithAsmJsFallback
  );

  function union(polygons) {
    const inputs = _.map(polygons, (polygon) => ({ data: polygon, closed: true }));
    return clipper.clipToPaths({
      clipType: clipperLib.ClipType.Union,
      subjectInputs: inputs,
      subjectFillType: clipperLib.PolyFillType.Positive
    });
  }

  function extrudePolyline(line, delta=2) {
   return clipper.offsetToPaths({
      delta: delta,
      offsetInputs: [{
        data: line,
        joinType: clipperLib.JoinType.Square,
        endType: clipperLib.EndType.OpenButt
      }],
    })[0];
  }

  function offsetPolygon(polygon, delta=2) {
    return clipper.offsetToPolyTree({
      delta: delta,
      offsetInputs: [{
        data: polygon,
        joinType: clipperLib.JoinType.Round,
        endType: clipperLib.EndType.ClosedPolygon,
      }],
    })?.getFirst()?.contour;
  }

  function intersection(poly1, poly2) {
    const in1 = { data: poly1, closed: true };
    const in2 = { data: poly2, closed: true };
    return clipper.clipToPaths({
      clipType: clipperLib.ClipType.Intersection,
      subjectInputs: [in1],
      clipInputs: [in2],
      subjectFillType: clipperLib.PolyFillType.Positive
    });
  }

  // skip `internal` edges
  const edges = _.filter(net.edge, edge => edge.$.function != 'internal');

  const edge_lane_polys = _.map(edges, (edge, id) => {
    // force array
    var lanes = Array.isArray(edge.lane) ? edge.lane : [edge.lane];
    return {
      id: edge.$.id,
      to: edge.$.to,
      from: edge.$.from,
      lanes: _.map(lanes, (lane, id) => {
        const points = parseShape(lane.$.shape);
        return extrudePolyline(toClipper(points), EXTRUDE_SCALE * SCALE);
      })
    };
  });
  
  /** Merge close vertices such that a very thin rectangle becomes an actual line. */
  function cleanLine(line) {
    const points = {};
    _.forEach(line, point => {
      points[`${Math.round(point.x / 10)},${Math.round(point.y / 10)}`] = point;
    });
    return Object.values(points);
  }

  // find intersection of lanes, we assume that lanes are ordered
  let lane_seams = [];
  _.map(edge_lane_polys, edge => {
    for (let i = 0; i < edge.lanes.length - 1; ++i) {
      const line = intersection(edge.lanes[i], edge.lanes[i+1])[0];
      lane_seams.push(cleanLine(line));
    }
  });

  // find intersection of edges and merge lanes
  let edge_polys = [];
  let edge_seams = [];
  let done = [];
  _.forEach(edge_lane_polys, edge => {
    if (done.includes(edge.id)) return
    done.push(edge.id);

    const lanes = union(edge.lanes);
    edge_polys.push(lanes[0]);

    // find all potential opposite edges
    const opposite_id = edge.id[0] == '-' ? edge.id.slice(1) : `-${edge.id}`;
    const opposites = _.filter(edge_lane_polys, e =>
            e.from == edge.to || e.to == edge.from
            || e.id == opposite_id)

    _.map(opposites, opposite => {
        const opposite_lanes = union(opposite.lanes);
        edge_polys.push(opposite_lanes[0]);

        const line = intersection(lanes, opposite_lanes)[0];
        if (line) edge_seams.push(cleanLine(line));
    })
  });

  // skip `dead_end` and `internal` junctions
  const junctions = _.filter(net.junction, junction => ['traffic_light', 'priority'].includes(junction.$.type));
  const junction_polys = _.map(junctions, junction => {
    const points = parseShape(junction.$.shape);
    return toClipper(points);
  });

  const merged_edges = union(_.map(edge_polys, p => offsetPolygon(p, 40)));
  const merged_junctions = union(_.map(junction_polys, p => offsetPolygon(p, 40)))
  const merged_road = union([merged_edges, merged_junctions]);

  // TODO: Note that this method is not capable of correctly displaying the 'holes' of the polygon.
  // Instead, it now just draws the holes as filled polygons.
  function drawPolys(polys, color='black', fill='red') {
    _.map(polys, p => drawPolygon(fromClipper(p), { color, fill }))
  }

  drawPolys(merged_road)

  const lines_side = _.compact(_.map(merged_road, p => offsetPolygon(p, -LINE_OFFSET * SCALE)));
  const lines_between = [...edge_seams, ...lane_seams];

  function extrudeLine(lines, endType) {
    return _.map(lines, l => 
      clipper.offsetToPaths({
        delta: LINE_WIDTH * SCALE,
        offsetInputs: [{
          data: l,
          joinType: clipperLib.JoinType.Square,
          endType: endType,
        }],
      })
    );
  }

  // extrude lines
  const line_polys = [
    ...extrudeLine(lines_side, clipperLib.EndType.ClosedLine),
    ...extrudeLine(lines_between, clipperLib.EndType.OpenButt),
  ]

  function polygonToMesh(polygon, material) {
    let outer = [];
    let holes = [];

    // check if this is a polygon with holes (then the polygons after the first define holes)
    if (_.has(polygon[0][0], 'x')) {
      // first one is the outer boundary
      outer = _.map(fromClipper(polygon[0]), (point) => new three.Vector2( point[0], point[1] ));

      // the rest of the polygons define the holes
      _.forEach(polygon.slice(1), p => {
        const points = _.map(fromClipper(p), (point) => new three.Vector2( point[0], point[1] ));
        const path = new three.Path(points);
        holes.push(path);
      });
    } else {
      outer = _.map(fromClipper(polygon), (point) => new three.Vector2( point[0], point[1] ));
    }

    const shape = new three.Shape(outer);
    shape.holes = holes;
    
    const geometry = new three.ShapeGeometry( shape );
    material.side = three.DoubleSide;
    const mesh = new three.Mesh( geometry, material );
    mesh.rotation.set(Math.PI / 2, 0, 0);
    return mesh;
  }

  function lineToMesh(line) {
    const points = _.map(fromClipper(line), (point) => new three.Vector2( point[0], point[1] ));
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

  function drawPolygons3D(roadPolygon, line_polys) {
    const renderer = new three.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = three.sRGBEncoding;
    document.body.appendChild(renderer.domElement);

    const camera = new three.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    const controls = new OrbitControls(camera, renderer.domElement);
    camera.position.set(500, 200, 500);
    controls.target.set(500, 0, 500);
    controls.update()

    const scene = new three.Scene();
    const light = new three.AmbientLight(0x404040);
    scene.add(light);

    const directionalLight = new three.DirectionalLight(0xffffff, 0.5);
    scene.add(directionalLight);

    const roadMaterial = new three.MeshBasicMaterial({ color: 'red' });
    const lineMaterial = new three.MeshBasicMaterial({ color: 'white' });

    scene.add(polygonToMesh(roadPolygon, roadMaterial));
    _.map(line_polys, p => {
      const mesh = polygonToMesh(p, lineMaterial);
      mesh.translateZ(-0.01);
      scene.add(mesh);
    });

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
  }

  drawPolygons3D(merged_road, line_polys);
}
