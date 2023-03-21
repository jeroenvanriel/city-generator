import { BufferGeometry, Float32BufferAttribute } from 'three';

class RowhouseRoofGeometry extends BufferGeometry {

	constructor(polygon, midline, height) {
		super();

		this.type = 'RowhouseRoofGeometry';

		this.midline = midline;
		this.height = height;

		// buffer
		const vertices = [];
		const indices = [];

		// create buffer data
		generateBufferData();

		// build geometry
		this.setIndex( indices );
		this.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );
		this.computeVertexNormals();

		// functions

		function generateBufferData() {
            // add all midline vertices
            for (let i = 0; i < midline.length; i++) {
                vertices.push(midline[i].x, height, midline[i].y);
            }

            const p = polygon[0];
            let mxPrev = 0;
            vertices.push( p.x, 0, p.y );

			for (let i = 1; i < polygon.length; i++) {
				const p = polygon[i];
                let mx;
                // find the index of nearest midline point
                if (i < midline.length) {
                    mx = i; // left side
                } else if (i == polygon.length - 1) {
                    mx = 0; // first point again (assume closed polygon)
                } else { // right side
                    mx = 2 * midline.length - i - 1;
                }
				vertices.push( p.x, 0, p.y );

				// faces
                const a = midline.length + i - 1;
                const b = mxPrev;
                const c = mx;
                const d = midline.length + i;

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
