import { BufferGeometry, Float32BufferAttribute } from 'three';

class RowhouseGeometry extends BufferGeometry {

	constructor( points, height ) {
		super();

		this.type = 'RowhouseGeometry';

		this.points = points;
		this.height = height;

		// buffer
		const vertices = [];
		const indices = [];
		const uvs = [];

		// create buffer data
		generateBufferData();
		generateIndices();

		// build geometry
		this.setIndex( indices );
		this.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );
		this.setAttribute( 'uv', new Float32BufferAttribute( uvs, 2));
		this.computeVertexNormals();

		// functions

		function generateBufferData() {
			for (let i = 0; i <= points.length - 2; i++) {
				const p = points[i];
				const r = points[i + 1];

				vertices.push( p.x, 0, p.y );
				vertices.push( p.x, height, p.y );
				vertices.push( r.x, height, r.y );
				vertices.push( r.x, 0, r.y );

				uvs.push(0, 0)
				uvs.push(0, 1)
				uvs.push(1, 1)
				uvs.push(1, 0)
			}
		}

		function generateIndices() {
			for (let i = 0; i <= points.length - 2; i++) {
				const a = 4 * i;
				const b = 4 * i + 1;
				const c = 4 * i + 2;
				const d = 4 * i + 3;

				// faces
				indices.push( a, b, d );
				indices.push( b, c, d );
			}
		}
	}

	clone() {
		// pass parameters
		return new this.constructor(this.points, this.height).copy(this);
	}

}

export { RowhouseGeometry };
