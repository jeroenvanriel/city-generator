import * as three from 'three';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { distance, asVector2 } from './utils';

class PathPlaneGeometry extends BufferGeometry {

	constructor( bottomPoints, topPoints ) {
		super();

		this.type = 'PathPlaneGeometry';

        this.bottomPoints = bottomPoints;
		this.topPoints = topPoints;

		// buffer
		const vertices = [];
		const indices = [];
		const uvs = [];

		// create buffer data
		generateBufferData();

		// build geometry
		this.setIndex( indices );
		this.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );
		// this.setAttribute( 'uv', new Float32BufferAttribute( uvs, 2));
		this.computeVertexNormals();

		function generateBufferData() {
			for (let i = 0; i < topPoints.length - 1; i++) {
				const p = bottomPoints[i];
				const q = bottomPoints[i+1];
				const r = topPoints[i];
				const s = topPoints[i+1];

				vertices.push( p.x, p.y, p.z );
				vertices.push( r.x, r.y, r.z );
				vertices.push( s.x, s.y, s.z );
				vertices.push( q.x, q.y, q.z );

				const a = 4 * i;
				const b = 4 * i + 1;
				const c = 4 * i + 2;
				const d = 4 * i + 3;

				// faces
				indices.push( a, b, d );
				indices.push( b, c, d );

                // uvs
                // TODO: check these
				// const width = distance(p, q);

				// const v = new three.Vector2().subVectors(
				// 	asVector2(p),
				// 	asVector2(q)
				// ).normalize();

				// const w1 = new three.Vector2().subVectors(
				// 	asVector2(r),
				// 	asVector2(p)
				// );
				// const w2 = new three.Vector2().subVectors(
				// 	asVector2(s),
				// 	asVector2(q)
				// );

				// const shear1 = v.dot(w1);
				// const shear2 = -v.dot(w2)

				// v.rotateAround(origin, -Math.PI / 2);
				// const depth = v.dot(w1); // should be the same also for w2
				// const diagonal = Math.sqrt( height*height + depth*depth );

				// uvs.push(shear1, 0);
				// uvs.push(0, diagonal);
				// uvs.push(shear1 + width + shear2, diagonal);
				// uvs.push(shear1 + width, 0);
            }
        }
	}

	clone() {
		// pass parameters
		return new this.constructor(this.bottomPoints, this.topPoints).copy(this);
	}

}

export { PathPlaneGeometry };
