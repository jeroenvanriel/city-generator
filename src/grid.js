import * as three from 'three';
import { difference, toClipper } from './utils';

export function grid(polygon, gridLength, gridWidth) {
    // compute bounding box of the polygon
    const bb = new three.Box2();
    bb.setFromPoints(polygon.map(p => new three.Vector2(p[0], p[1])));
    let xMin = bb.min.x, xMax = bb.max.x,
        zMin = bb.min.y, zMax = bb.max.y;
    
    const xDifForGrid = Math.ceil((xMax - xMin) / gridLength);
    const zDifForGrid = Math.ceil((zMax - zMin) / gridWidth);

    var gridCoords = [];
    for (let i = 0; i <= xDifForGrid; i++) {
        gridCoords.push([])
        for (let j = 0; j <= zDifForGrid; j++) {
            gridCoords[i].push([xMin + (i*gridLength), zMin + (j*gridWidth)]);
        }
    }

    // create the boolean grid from the grid of the boundingbox together with the intersection of the polygon
    let grid = [];
    // TODO: why the "-1"?
    for (let i = 0; i < gridCoords.length - 1; i++) {
        grid.push([]);
        for (let j = 0; j < gridCoords[i].length - 1; j++) {
            // gridcell polygon (closed)
            let gridCellPoly = [gridCoords[i][j], gridCoords[i][j+1], gridCoords[i+1][j+1], gridCoords[i+1][j], gridCoords[i][j]];

            // compute intersection between grid cell and polygon
            // we only need to check if the result is empty
            const res = difference(toClipper(gridCellPoly), toClipper(polygon))
            grid[i].push(res.length == 0 ? gridCellPoly : null);
        }
    }

    return grid;
}
