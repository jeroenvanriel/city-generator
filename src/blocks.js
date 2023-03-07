import * as three from 'three';
import { Mesh } from 'three';
import { getRandomInt } from './utils';

export default function blocks(scene) {
    const material = new three.MeshStandardMaterial( {color: 0xff000f} );
    const pyramidMaterial = new three.MeshStandardMaterial( {color: 0x00ff0f} )
    const geometryWidth = 10;
    const geometryHeight = 10;
    const geometryDepth = 10;
    const geometry = new three.BoxGeometry( geometryWidth, geometryHeight, geometryDepth );
    const pyramidGeometry = new three.ConeGeometry(geometryWidth, geometryHeight, 4,);
    var cube = [];

    geometry.computeBoundingBox();
    const size = new three.Vector3();
    geometry.boundingBox.getSize(size);

    for (let i = 1; i < 10; i += 1) {
        //positions for current iteration
        //var Pos = new three.Vector3(getRandomInt(0, 100), size.y / 2, getRandomInt(0, 100));
        var xPos = getRandomInt(0, 100);
        var zPos = getRandomInt(0, 100);
        var flatHeight = getRandomInt(20, 40);
        //differentiate between types of buildings: 1 = flat, 2 = normal house
        var type = getRandomInt(0,2);
        if (type == 1) { // flat
            cube[i] = new three.Mesh( new three.BoxGeometry( geometryWidth, flatHeight, geometryDepth ), material );
            cube[i].position.add(new three.Vector3(xPos, flatHeight / 2, zPos));
        } 
        else { // house with roof
            cube[i] = new three.Mesh( geometry, material );
            cube[i].position.add(new three.Vector3(xPos, geometryHeight / 2, zPos));

            //roof
            var pyramid = new three.Mesh( pyramidGeometry, pyramidMaterial);
            pyramid.position.add(new three.Vector3(xPos, geometryHeight + (geometryHeight/2), zPos));
            pyramid.rotateY((2*Math.PI) / 8);
            scene.add(pyramid);
        }
        scene.add( cube[i] );
    }

}
