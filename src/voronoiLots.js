import * as three from 'three';
import Voronoi from 'voronoi';

import { getSegments } from './utils';
import { between, distance, drawSphere, intersection, polygonToMesh, toClipper, fromClipper } from './utils';
import { getGradient } from './material';

/** 
 * Subdivides a network face in lots using a Voronoi division.
 * 
 * The current implementation is only demonstrating the idea by drawing
 * the lots.
 */
export function voronoiDivision(scene, clipper, face, innerPolygon) {

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

    for (const point of points) {
        drawSphere(scene, point, { color: 'black' });
    }

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

    // draw lots
    let i = 0;
    const materials = getGradient(30, 'red', 'green');
    for (const cell of diagram.cells) {
        const cellPolygon = cell.halfedges.map(edge => edge.getStartpoint());
        cellPolygon.push(cell.halfedges.at(-1).getEndpoint());

        const clipped_poly = fromClipper(intersection(clipper, toClipper(cellPolygon), toClipper(face))[0]);

        // clipped voronoi cell
        polys.push(clipped_poly);

        const material = materials[i];
        scene.add(polygonToMesh([clipped_poly], material))
        i++;
    }

    return [points_copy, polys];
}
