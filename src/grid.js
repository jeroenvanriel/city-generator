import * as three from 'three';
import * as clipperLib from 'js-angusj-clipper/web';
import { intersection, polygonToMesh } from './utils';

export default function grid(scene, clipper) {
    
    //From https://stackoverflow.com/questions/45773273/draw-svg-polygon-from-array-of-points-in-javascript
    //var svg = document.getElementById("svg");
    //var polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    //svg.appendChild(polygon);

    //From https://stackoverflow.com/questions/50171936/rendering-a-polygon-with-input-vertices-in-three-js and
    //From https://jsfiddle.net/prisoner849/3xwt0yh8/
    var coordinates = [{x : 0, y : 0, z: 0}, {x : 0, y : 0, z: -100}, {x : -50, y : 0, z: -50}];
 
    const coordinatesShape = new three.Shape(coordinates);
    const coordinatesGeom = new three.ShapeGeometry(coordinatesShape);
    const coordinatesMat = new three.MeshStandardMaterial( {color: 0x0000ff} );
    var polygon = new three.Mesh(coordinatesGeom, coordinatesMat);
    polygon.material.side = three.DoubleSide; // visible from above and below.
    polygon.geometry.rotateX(Math.PI / 2);
    polygon.receiveShadow = true;

    scene.add(polygon);

    coordinatesGeom.computeBoundingBox();
    const bb = coordinatesGeom.boundingBox;
    var bbMin = bb.min;
    var bbMax = bb.max;

    console.log(bbMin + " " + bbMax);

    //compute bounding box of the coordinates
    var xMin = Number.MAX_SAFE_INTEGER;
    var xMax = Number.MIN_SAFE_INTEGER;
    var zMin = Number.MAX_SAFE_INTEGER;
    var zMax = Number.MIN_SAFE_INTEGER;

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
    
    let polyGrid = createGrid(xMin, xMax, zMin, zMax);
    
    let testCoordinates = [[coordinates[0].x, coordinates[0].z],
                           [coordinates[1].x, coordinates[1].z],
                           [coordinates[2].x, coordinates[2].z]];
    console.log(testCoordinates);
    let testCell = [polyGrid[0][0], polyGrid[0][1], polyGrid[1][0], polyGrid[1][1]]
    console.log(testCell);

    polygonToMesh(testCoordinates, coordinatesMat);
    polygonToMesh(testCell, new three.MeshStandardMaterial( {color: 0x00ff0f} ));
    
    console.log(clipper)
    //const inter = intersection(clipper, testCell, testCoordinates);


    //create grid from boundingbox of a polygon
    function createGrid(xMin, xMax, zMin, zMax) {
        const gridLength = 10; //should be length of building
        const gridWidth = 10; //should be width of building
        const xDifForGrid = (xMax - xMin) / gridLength;
        const zDifForGrid = (zMax - zMin) / gridWidth;
        console.log(xDifForGrid + ", " + zDifForGrid);
        var grid = createArray(xDifForGrid, zDifForGrid);
        console.log(grid);

        for (let i=0; i < grid.length; i += 1 ) {
            for(let j=0; j < grid[i].length; j += 1) {
                grid[i][j] = [xMin + (i*gridLength),zMin + (j*gridWidth)];
                //console.log(grid[i][j]);
            }
        }
        return grid;
    }



    //from https://stackoverflow.com/questions/966225/how-can-i-create-a-two-dimensional-array-in-javascript/966938#966938
    function createArray(length) {
        var arr = new Array(length || 0),
            i = length;
    
        if (arguments.length > 1) {
            var args = Array.prototype.slice.call(arguments, 1);
            while(i--) arr[length-1 - i] = createArray.apply(this, args);
        }
    
        return arr;
    }
}

    //Clipper function
    export async function intersectionGridAndPoly(grid, polygon) {
        const clipper = await clipperLib.loadNativeClipperLibInstanceAsync(
            clipperLib.NativeClipperLibRequestedFormat.WasmWithAsmJsFallback
          );
    }