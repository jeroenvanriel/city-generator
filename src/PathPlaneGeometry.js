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
		this.setAttribute( 'uv', new Float32BufferAttribute( uvs, 2));
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
				const width = distance(p, q);
				const height1 = distance(p, r);
				const height2 = distance(q, s);

				const v = new three.Vector3().subVectors(p, q).normalize();

				const w1 = new three.Vector3().subVectors(r, p);
				const w2 = new three.Vector3().subVectors(s, q);

				const shear1 = v.dot(w1);
				const shear2 = -v.dot(w2)

				uvs.push(shear1, 0);
				uvs.push(0, height1);
				uvs.push(shear1 + width + shear2, height2);
				uvs.push(shear1 + width, 0);
            }
        }
	}

	clone() {
		// pass parameters
		return new this.constructor(this.bottomPoints, this.topPoints).copy(this);
	}

}

export { PathPlaneGeometry };
