import { BufferGeometry, Float32BufferAttribute } from 'three';

class RowhouseRoofGeometry extends BufferGeometry {

	constructor( polygon, midline, height ) {
		super();

		this.type = 'RowhouseRoofGeometry';

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
            let mxPrev = getNearest(p);
            vertices.push( p.x, 0, p.y );

			for (let i = 1; i < polygon.length; i++) {
				const p = polygon[i];
                // find the index of nearest midline point
                const mx = getNearest(p);
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

        function getNearest(p) {
            // TODO: make this efficient (just brute-force search now)
            let nearest;
            let min = 10000;
            for (let i = 0; i < midline.length; i++) {
                const dist = midline[i].distanceTo(p);
                if (dist < min) {
                    nearest = i;
                    min = dist;
                }
            }
            return nearest;
        }

	}

}

export { RowhouseRoofGeometry };
