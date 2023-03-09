import * as clipperLib from 'js-angusj-clipper/web';
import * as _ from 'lodash';

// read the polygon points from the SUMO format
function parseShape(shape) {
  return shape.split(' ').map(coord => coord.split(',').map(Number));
}

// clipper uses integer numbers, so we multiply
const SCALE = 1000;

const EXTRUDE_SCALE = 1.65;
const LINE_OFFSET = 0.08;
const LINE_WIDTH = 0.08;

function fromSUMO(points) {
  return _.map(points, (point) => ({
    x: Math.round(SCALE * point[0]),
    y: - Math.round(SCALE * point[1]), // SUMO format has flipped y-coordinates
  }));
}

function toClipper(points) {
  return _.map(points, (point) => ({
    x: Math.round(SCALE * point[0]),
    y: Math.round(SCALE * point[1]),
  }));
}

function fromClipper(points) {
  return _.map(points, (point) => [
    point.x / SCALE,
    point.y / SCALE,
  ]);
}

export async function loadNetwork(net) {

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
        return extrudePolyline(fromSUMO(points), EXTRUDE_SCALE * SCALE);
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
    return fromSUMO(points);
  });

  const merged_edges = union(_.map(edge_polys, p => offsetPolygon(p, 40)));
  const merged_junctions = union(_.map(junction_polys, p => offsetPolygon(p, 40)))
  const merged_road = union([merged_edges, merged_junctions]);

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

  // extrude these lines to polygons
  const lines_side_polys = extrudeLine(lines_side, clipperLib.EndType.ClosedLine);
  const lines_between_polys = extrudeLine(lines_between, clipperLib.EndType.OpenButt);

  // convert coordinates back from Clipper integers
  // merged_road is a single polygon
  // lines_{side,between}_polys is a list of polygons
  // where each polygon is a list of paths,
  // and each path a list of points,
  // each point an array of length 2 containing [x,y]
  return [
    merged_road.map(polygon => fromClipper(polygon)),

    lines_side_polys.map(line_mesh => 
      line_mesh.map(polygon => fromClipper(polygon))
    ),

    lines_between_polys.map(line_mesh =>
      line_mesh.map(polygon => fromClipper(polygon))
    )
  ]
}

export function offsetPolygon(clipper, polygon, delta=2) {
  return fromClipper(clipper.offsetToPolyTree({
    delta: delta * SCALE,
    offsetInputs: [{
      data: toClipper(polygon),
      joinType: clipperLib.JoinType.Round,
      endType: clipperLib.EndType.ClosedPolygon,
    }],
  })?.getFirst()?.contour);
}
