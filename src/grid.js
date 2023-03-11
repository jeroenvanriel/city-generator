import * as three from 'three';
import * as clipperLib from 'js-angusj-clipper/web';
import { intersection, polygonToMesh } from './utils';
import { ColorKeyframeTrack } from 'three';

export default function grid(scene, clipper) {
    
    //From https://stackoverflow.com/questions/50171936/rendering-a-polygon-with-input-vertices-in-three-js and
    //From https://jsfiddle.net/prisoner849/3xwt0yh8/
    var coordinates = [{x : 0, y : 0, z: 0}, {x : 0, y : 0, z: -55}, {x : 50, y:0, z:20}];

    //add library for polygon clipping
    const polygonClipping = require('polygon-clipping')
 
    const coordinatesShape = new three.Shape(coordinates);
    const coordinatesGeom = new three.ShapeGeometry(coordinatesShape);
    const coordinatesMat = new three.MeshStandardMaterial( {color: 0x0000ff} );
    var polygon = new three.Mesh(coordinatesGeom, coordinatesMat);
    polygon.material.side = three.DoubleSide; // visible from above and below.
    polygon.geometry.rotateX(Math.PI / 2);
    polygon.receiveShadow = true;

    scene.add(polygon);

    //compute bounding box of the polygon
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
    
    //Create a grid of the bounding box of the polygon
    let polyGrid = createGrid(xMin, xMax, zMin, zMax);
    
    let testCoordinates = [[coordinates[0].x, coordinates[0].z],
                           [coordinates[1].x, coordinates[1].z],
                           [coordinates[2].x, coordinates[2].z]];
    let polyCoord = polygonToMesh([testCoordinates], coordinatesMat);
    scene.add(polyCoord);
    
    /* TESTING

    //let testPoint = [-45,-95];
    console.log(testCoordinates);
    let testCellFalse = [polyGrid[0][0], polyGrid[0][1], polyGrid[1][0], polyGrid[1][1]];
    let testCellTrue =  [polyGrid[3][5], polyGrid[3][6], polyGrid[4][5], polyGrid[4][6]];
    let testCellTrue2 =  [polyGrid[3][2], polyGrid[3][3], polyGrid[4][2], polyGrid[4][3]];
    let testCellHalf =  [polyGrid[3][8], polyGrid[3][9], polyGrid[4][8], polyGrid[4][9]];
    let testCellHalf2 =  [polyGrid[3][1], polyGrid[3][2], polyGrid[4][1], polyGrid[4][2]]; 

    let polyTestFalse = polygonToMesh([testCellFalse], new three.MeshStandardMaterial( {color: 0x00ff0f} ));
    let polyTestTrue = polygonToMesh([testCellTrue], new three.MeshStandardMaterial( {color: 0x00ff0f} ));
    let polyTestTrue2 = polygonToMesh([testCellTrue2], new three.MeshStandardMaterial( {color: 0x00ff0f} ));
    let polyTestHalf = polygonToMesh([testCellHalf], new three.MeshStandardMaterial( {color: 0x00ff0f} ));
    let polyTestHalf2 = polygonToMesh([testCellHalf2], new three.MeshStandardMaterial( {color: 0x00ff0f} ));

    scene.add(polyTestFalse);
    scene.add(polyTestTrue);
    scene.add(polyTestTrue2);
    scene.add(polyTestHalf);
    scene.add(polyTestHalf2);
    
    console.log(clipper);
    
    //console.log(testPoint)
    //var test = clipper.pointInPolygon(testPoint,[testCell]);
    //console.log(test);

    //const poly1 = [[[0,0],[2,0],[0,2],[0,0]]]
    //const poly2 = [[[-1,0],[1,0],[0,1],[-1,0]]]

    var fullInter = polygonClipping.intersection([testCoordinates], [testCellTrue]);
    console.log(fullInter);
    var fullInter2 = polygonClipping.intersection([testCoordinates], [testCellTrue2]);
    console.log(fullInter2);
    var noInter = polygonClipping.intersection([testCoordinates], [testCellFalse]);
    console.log(noInter);
    var halfInter = polygonClipping.intersection([testCoordinates], [testCellHalf]);
    console.log(halfInter);
    var halfInter2 = polygonClipping.intersection([testCoordinates], [testCellHalf2]);
    console.log(halfInter2);
    **/


    //Create the boolean grid from the grid of the boundingbox together with the intersection of the polygon
    let boolGrid = createArray(polyGrid.length - 1, polyGrid[0].length - 1);

    for (let i=0; i < polyGrid.length - 1; i += 1) {
        for (let j=0; j < polyGrid[i].length - 1; j += 1) {
            //create cell of grid with four points of the grid
            let gridCellPoly = [polyGrid[i][j], polyGrid[i][j+1], polyGrid[i+1][j], polyGrid[i+1][j+1]];
            let gridCellPolytoMesh = polygonToMesh([gridCellPoly], new three.MeshStandardMaterial( {color: 0xfff000} ));
            scene.add(gridCellPolytoMesh);

            //compute intersection between grid cell and polygon
            let polyIntersectionCheck = polygonClipping.intersection([testCoordinates], [gridCellPoly]);
            //check if intersection is the whole grid cell
            if (polyIntersectionCheck.length == 2) {
                let counter = 0;
                for (let k=0; k < polyIntersectionCheck.length; k++) {
                    for (let l=0; l < polyIntersectionCheck[k][0].length; l++) {
                        if ((polyIntersectionCheck[k][0][l].includes(polyGrid[i][j][0]) && polyIntersectionCheck[k][0][l].includes(polyGrid[i][j][1])) ||
                            (polyIntersectionCheck[k][0][l].includes(polyGrid[i][j+1][0]) && polyIntersectionCheck[k][0][l].includes(polyGrid[i][j+1][1])) ||
                            (polyIntersectionCheck[k][0][l].includes(polyGrid[i+1][j][0]) && polyIntersectionCheck[k][0][l].includes(polyGrid[i+1][j][1])) ||
                            (polyIntersectionCheck[k][0][l].includes(polyGrid[i+1][j+1][0]) && polyIntersectionCheck[k][0][l].includes(polyGrid[i+1][j+1][1]))) {
                                counter++;
                            }
                        if (counter >= 5 && polyIntersectionCheck[0][0].length == 4 && polyIntersectionCheck[1][0].length == 4) {
                            boolGrid[i][j] = 1;
                        } else {
                            boolGrid[i][j] = 0; 
                        }
                    }
                }
            } else {
                boolGrid[i][j] = 0;
            }
        }
    }
    console.log(boolGrid);

    //create grid from boundingbox of a polygon
    function createGrid(xMin, xMax, zMin, zMax) {
        const gridLength = 10; //should be length of building
        const gridWidth = 10; //should be width of building
        const xDifForGrid = Math.ceil((xMax - xMin) / gridLength);
        const zDifForGrid = Math.ceil((zMax - zMin) / gridWidth);
        var grid = createArray(xDifForGrid + 1, zDifForGrid + 1);

        for (let i=0; i < grid.length; i += 1 ) {
            for(let j=0; j < grid[i].length; j += 1) {
                grid[i][j] = [xMin + (i*gridLength),zMin + (j*gridWidth)];
            }
        }
        return grid;
    }



    //from https://stackoverflow.com/questions/966225/how-can-i-create-a-two-dimensional-array-in-javascript/966938#966938
    //function to create array
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