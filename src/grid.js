import * as three from 'three';

export default function grid(scene) {
    //From https://stackoverflow.com/questions/50171936/rendering-a-polygon-with-input-vertices-in-three-js and
    //From https://jsfiddle.net/prisoner849/3xwt0yh8/
    var coordinates = [
        new three.Vector3(0, 0, 0),
        new three.Vector3(0, 0, -100),
        new three.Vector3(-50, 0, -50),
    ]
    
    let coordinatesGeom = new three.BufferGeometry().setFromPoints(coordinates);
    const coordinatesMat = new three.MeshStandardMaterial( {color: 0x0000ff} );
    var polygon = new three.Mesh(coordinatesGeom, coordinatesMat);
    scene.add(polygon);

    coordinatesGeom.computeBoundingBox();
    const bb = coordinatesGeom.boundingBox;
    var bbMin = bb.min;
    var bbMax = bb.max;

    console.log(bbMin + " " + bbMax);

    //compute bounding box of the coordinates
    var xMin = 100000;
    var xMax = -100000;
    var zMin = 100000;
    var zMax = -100000;

    for (let i = 0; i < coordinates.length; i += 1) {
        if (coordinates[i].x <= xMin) {
            xMin = coordinates[i].x;
        }
        if (coordinates[i].x >= xMax) {
            xMax = coordinates[i].x;
        }
        if (coordinates[i].z <= zMin) {
            zMin = coordinates[i].z;
        }
        if (coordinates[i].z >= zMax) {
            zMax = coordinates[i].z;
        }
    }
    console.log(xMin + " " + xMax + " " + zMin + " " + zMax);
    
    createGrid(xMin, xMax, zMin, zMax);

    //create grid from boundingbox of a polygon
    function createGrid(xMin, xMax, zMin, zMax) {
        const gridLength = 10 //should be length of building
        const gridWidth = 10 //should be width of building
        const xDifForGrid = (xMax - xMin) / gridLength
        const zDifForGrid = (zMax - zMin) / gridWidth
        console.log(xDifForGrid + ", " + zDifForGrid)
        var grid = [];

        for (let i=0; i < xDifForGrid; i += 1 ) {
            for(let j=0; j < zDifForGrid; j += 1) {
                grid.push([xMin + (i*gridLength), zMin + (j*gridWidth)]);
                console.log(grid[i][j]);
            }
        }
    }
}