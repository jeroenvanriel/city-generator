import * as three from 'three';

export default function blocks(scene) {
    const material = new three.MeshStandardMaterial( {color: 0xff000f} );
    const geometry = new three.BoxGeometry( 10, 10, 12 );

    geometry.computeBoundingBox();
    const size = new three.Vector3();
    geometry.boundingBox.getSize(size)

    for (let i = 1; i < 10; i += 1) {
        const cube = new three.Mesh( geometry, material );
        // make sure that the bottom of the buildings is at zero by adding half the height
        cube.position.add(new three.Vector3(getRandomInt(0, 100), size.y / 2, getRandomInt(0, 100)))
        scene.add( cube );
    }

}

/** Returns a random integer between min and max. */
function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
