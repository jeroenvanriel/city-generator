import * as three from 'three';
import { randomUniform, gaussianRandom } from './utils';
import { sum } from 'lodash';
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';

/** Generate a simple skyscraper-like building. */
export default function building(params) {
    const defaults = { floors: 4, height: 50, height_eps: 5, n_polygon: 4, angular_eps: 0.3, radius: 10, radius_eps: 5 };
    params = Object.assign(defaults, params);

    const geometries = [];

    // sample decreasing radius ranges
    const radius_bounds = [];
    for (let i = 1; i <= params.floors; i++ ) {
        radius_bounds.push(randomUniform(params.radius - params.radius_eps, params.radius + params.radius_eps));
        radius_bounds.push(randomUniform(params.radius - params.radius_eps, params.radius + params.radius_eps));
    }
    // sort in descending order
    radius_bounds.sort(function desc(a, b) { return b - a });

    for (let i = 1; i <= params.floors; i++) {
        // use the nested radius bounds
        const shape = randomPolygon(params.n_polygon, params.angular_eps, radius_bounds[2*(i-1)], radius_bounds[2*(i-1) + 1]);

        const h_mid = i * params.height / params.floors;
        const height = randomUniform(h_mid - params.height_eps, h_mid + params.height_eps);
        const extrudeSettings = {
            depth: height,
            bevelEnabled: true,
            steps: 1,
            bevelThickness: 1,
            bevelSize: 1,
            bevelOffset: 0,
            bevelSegments: 1
        };

        const geometry = new three.ExtrudeGeometry( shape, extrudeSettings );

        geometry.rotateX( - Math.PI / 2)
        geometry.translate(randomUniform(0, 3), 0, randomUniform(0, 3));

        geometries.push(geometry);
    }

    const material = new three.MeshStandardMaterial({ color: 0xff000f })
    const mergedGeometry = mergeBufferGeometries(geometries, true);
    return new three.Mesh( mergedGeometry, material ) ;
}

/** Inspird by https://stackoverflow.com/questions/8997099/algorithm-to-generate-random-2d-polygon */
function randomPolygon(n, angular_eps, radius_min, radius_max) {
    const delta_theta = [];
    for (let i = 0; i < n; i++) {
        delta_theta.push(randomUniform(2 * Math.PI / n - angular_eps, 2 * Math.PI / n + angular_eps));
    }
    const k = sum(delta_theta) / (2 * Math.PI);

    let theta = 0;
    let r = gaussianRandom(radius_min, radius_max)

    const shape = new three.Shape();
    shape.moveTo( r * Math.cos(theta), r * Math.sin(theta) );

    for (let i = 1; i < n ; i++) {
        theta += delta_theta[i]  / k;
        r = gaussianRandom(radius_min, radius_max)
        shape.lineTo( r * Math.cos(theta), r * Math.sin(theta) );
    }

    return shape;
}
