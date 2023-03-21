import * as three from 'three';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { asVector2, distance } from './utils';

class RowhouseRoofGeometry extends BufferGeometry {

	constructor(polygon, midline, height) {
		super();

		this.type = 'RowhouseRoofGeometry';

		this.midline = midline;
		this.height = height;

		// buffer
		const vertices = [];
		const indices = [];
		const uvs = [];

		// create buffer data
		generateBufferData();

		// build geometry
		this.setIndex( indices );
		this.setAttribute('position', new Float32BufferAttribute(vertices, 3 ));
		this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
		this.computeVertexNormals();

		// functions

		function generateBufferData() {
			const origin = new three.Vector2();

            let mxPrev = 0;
			for (let i = 1; i < polygon.length; i++) {
				const p = polygon[i-1];
				const q = polygon[i];

                let mx;
                // find the index of nearest midline point
                if (i < midline.length) {
                    mx = i; // left side
                } else if (i == polygon.length - 1) {
                    mx = 0; // first point again (assume closed polygon)
                } else { // right side
                    mx = 2 * midline.length - i - 1;
                }

				const r = midline[mxPrev];
				const s = midline[mx];

				vertices.push( p.x, 0, p.y );
				vertices.push( r.x, height, r.y);
				vertices.push( s.x, height, s.y);
				vertices.push( q.x, 0, q.y );

				const width = distance(p, q);

				const v = new three.Vector2().subVectors(
					asVector2(p),
					asVector2(q)
				).normalize();

				const w1 = new three.Vector2().subVectors(
					asVector2(r),
					asVector2(p)
				);
				const w2 = new three.Vector2().subVectors(
					asVector2(s),
					asVector2(q)
				);

				const shear1 = v.dot(w1);
				const shear2 = -v.dot(w2)

				v.rotateAround(origin, -Math.PI / 2);
				const depth = v.dot(w1); // should be the same also for w2
				const diagonal = Math.sqrt( height*height + depth*depth );

				uvs.push(shear1, 0);
				uvs.push(0, diagonal);
				uvs.push(shear1 + width + shear2, diagonal);
				uvs.push(shear1 + width, 0);

				// faces
				const a = 4*(i-1);
				const b = 4*(i-1) + 1;
				const c = 4*(i-1) + 2;
				const d = 4*(i-1) + 3;

				indices.push( a, b, d );
				indices.push( b, c, d );

                mxPrev = mx; 
			}
		}

	}

	clone() {
		return new this.constructor(this.midline, this.height).copy(this);
	}

}

export { RowhouseRoofGeometry };
