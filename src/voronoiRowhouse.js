import { buildHouse } from "./rowhouse";
import { offsetPolygon, asVector2List, fromClipper, toClipper, SCALE,  difference, intersection, randomUniform } from "./utils";
import { voronoiDivision } from "./voronoiLots";

export function buildVoronoiRowhouses(scene, clipper, face) {
    const houseHeight = 10;
    const roofHeight = 10;

    // TODO: parameterize these
    const inset = 25;
    const houseDepth = 20;
    const houseStart = fromClipper(offsetPolygon(clipper, toClipper(face), (houseDepth / 2 - inset) * SCALE));
    const midline = fromClipper(offsetPolygon(clipper, toClipper(face), - inset * SCALE));
    const houseEnd = fromClipper(offsetPolygon(clipper, toClipper(face), (- houseDepth / 2 - inset) * SCALE));

    const [_, polys] = voronoiDivision(scene, clipper, asVector2List(face), asVector2List(midline));

    for (const lot of polys) {
        const clip1 = fromClipper(intersection(clipper, toClipper(lot), toClipper(houseStart))[0]);
        const clip2 = fromClipper(difference(clipper, toClipper(clip1), toClipper(houseEnd))[0]);

        if (randomUniform(0, 1) < 0.8) {
            buildHouse(scene, clip2, houseHeight, roofHeight);
        }
    }

}
