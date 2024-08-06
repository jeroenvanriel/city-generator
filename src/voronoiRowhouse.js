import * as three from 'three';
import Voronoi from 'voronoi';

import { getSegments, offsetPolygon, asVector2List, between, distance, intersection, difference, toClipper, fromClipper, SCALE, randomUniform } from './utils';
import { buildHouse } from "./rowhouse";

export function buildVoronoiRowhouses(scene, face) {
    const houseHeight = 10;
    const roofHeight = 10;

    // TODO: parameterize these
    const inset = 25;
    const houseDepth = 20;
    const houseStart = fromClipper(offsetPolygon(toClipper(face), (houseDepth / 2 - inset) * SCALE));
    const midline = fromClipper(offsetPolygon(toClipper(face), - inset * SCALE));
    const houseEnd = fromClipper(offsetPolygon(toClipper(face), (- houseDepth / 2 - inset) * SCALE));

    const [_, polys] = voronoiDivision(scene, asVector2List(face), asVector2List(midline));

    for (const lot of polys) {
        const clip1 = fromClipper(intersection(toClipper(lot), toClipper(houseStart))[0]);
        const clip2 = fromClipper(difference(toClipper(clip1), toClipper(houseEnd))[0]);

        if (randomUniform(0, 1) < 0.8) {
            buildHouse(scene, clip2, houseHeight, roofHeight);
        }
    }

}

/** Subdivides a network face in lots using a Voronoi division. */
function voronoiDivision(scene, face, innerPolygon) {

    innerPolygon.push(innerPolygon[0]);
    const segments = getSegments(innerPolygon, 5, 5);

    const points = [];
    for (const segment of segments) {
        // get point half-way each edge
        for (let i = 0; i < segment.length - 1; i++) {
            if (i >= 0) {
                // points between segment edges
                points.push(segment[i]);
            }

            // TODO: parameterize
            const minStep = 40;
            const length = distance(segment[i], segment[i+1]);
            const parts = Math.floor(length / minStep);
            for (let j = 1; j <= parts - 1; j++) {
                points.push(between(segment[i], segment[i+1], j / parts));
            }
        }
    }

    const points_copy = points.slice();

    // compute Voronoi diagram
    let voronoi = new Voronoi();

    // compute bounding box
    let bbox = new three.Box2().setFromPoints(face);
    const pad = 0;
    let voronoi_bbox = {
        xl: bbox.min.x - pad, xr: bbox.max.x + pad,
        yt: bbox.min.y + pad, yb: bbox.max.y - pad
    };

    let diagram = voronoi.compute(points, voronoi_bbox);

    // close the original polygon
    face.push(face[0]);

    const polys = [];

    // compute lots by intersecting with bouding polygon
    let i = 0;
    for (const cell of diagram.cells) {
        const cellPolygon = cell.halfedges.map(edge => edge.getStartpoint());
        cellPolygon.push(cell.halfedges.at(-1).getEndpoint());

        const clipped_poly = fromClipper(intersection(toClipper(cellPolygon), toClipper(face))[0]);

        // clipped voronoi cell
        polys.push(clipped_poly);

        i++;
    }

    return [points_copy, polys];
}
