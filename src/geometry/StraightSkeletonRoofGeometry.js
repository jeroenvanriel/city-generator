import { BufferGeometry, Float32BufferAttribute } from 'three';
import { SkeletonBuilder } from 'straight-skeleton';
import earcut from 'earcut';

class StraightSkeletonRoofGeometry extends BufferGeometry {

    constructor(polygon, height) {
        super();

        this.type = 'StraightSkeletonRoofGeometry';
        this.height = height;

        // buffer
        const vertices = [];
        const indices = [];
        //const uvs = [];

        generateBufferData();
        this.setIndex( indices );
        this.setAttribute('position', new Float32BufferAttribute(vertices, 3 ));

        //this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
        //this.computeVertexNormals();

        function generateBufferData() {
            // compute the straight skeleton
            const result = SkeletonBuilder.buildFromPolygon([
                polygon.map((point) => [point.x, point.y])
            ]);

            // triangulate computed polygons
            let index_counter = 0;
            for (const polygon of result.polygons) {
                // use the original 3d points as vertices
                let flat3 = polygon.map((point) => result.vertices[point]);
                flat3 = flat3.map(([x,y,z]) => [x,z,y]).flat();
                vertices.push(...flat3);

                const flat2 = polygon.map((point) => result.vertices[point].slice(0, 2)).flat();
                // triangulate the flat polygons to obtain indices
                let triangulated = earcut(flat2);
                triangulated.reverse();  // apparently, this yields the right orientation
                indices.push(...triangulated.map((index) => index_counter + index))

                // TODO: compute uvs assuming each polygon is planar, we should
                // Project all points on this plane to compute the corresponding
                // uvs.
                // 1. compute plane from first 3 points
                // 2. determine left-bottom point
                // 3. compute uvs relative to this origin

                index_counter += flat3.length / 3;
            }
        }
    }

    clone() {
        return new this.constructor(this.midline, this.height).copy(this);
    }

}

export { StraightSkeletonRoofGeometry };
