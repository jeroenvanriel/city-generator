import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
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
        const uvs = [];

        generateBufferData();
        this.setIndex( indices );
        this.setAttribute('position', new Float32BufferAttribute(vertices, 3 ));

        this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
        this.computeVertexNormals();

        function generateBufferData() {
            // compute the straight skeleton
            const result = SkeletonBuilder.buildFromPolygon([
                polygon.map((point) => [point.x, point.y])
            ]);

            // triangulate computed polygons
            let index_counter = 0;
            for (const polygon of result.polygons) {
                let points = polygon.map((point) => result.vertices[point]);

                // The straight-skeleton library automatically adds a
                // z-coordinate (10 at full height, 0 at the edges and somewhere
                // in between in some situations) to produce the "roof" shape,
                // so we use that information to set our own height. Also
                // flatten the array.
                let flat3 = points.map(([x,y,z]) => [x,z / 10 * height,y]).flat();
                vertices.push(...flat3);

                // Compute the indices based on a triangulation of the vertices
                // in the flat plane.
                const flat2 = polygon.map((point) => result.vertices[point].slice(0, 2)).flat();
                let triangulated = earcut(flat2);
                triangulated.reverse();  // apparently, this yields the right orientation
                indices.push(...triangulated.map((index) => index_counter + index));

                // Compute the uvs. We use the lowest two points of each polygon
                // to determine the "main axis" of the patch, to which we match
                // the orientation of the texture.
                const lowest2 = points.filter(([x,y,z]) => z < 0.01).map(p => new Vector3(p[0], p[1], p[2]));
                const orientation = new Vector3().subVectors(...lowest2).normalize();
                for (const point of points) {
                    const p = new Vector3(...point);
                    const x = p.dot(orientation);
                    // Note that the y-coordinate does currently not scale with the
                    // actual height of the roof.
                    const y = p.sub(orientation.clone().multiplyScalar(x)).length();
                    uvs.push(x, y)
                }

                index_counter += flat3.length / 3;
            }
        }
    }

    clone() {
        return new this.constructor(this.midline, this.height).copy(this);
    }

}

export { StraightSkeletonRoofGeometry };
