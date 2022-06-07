import { Observable } from 'rxjs';
import { polyDiff, polyIntersection, polyOffset } from '../../shared/lib/clipper/cLipper-adapter';

type TPoint = { x: number, y: number, z?: number }

type TPolygon = TPoint[][]

const intersectionSkin = (subPaths, vectorsArray) => {
    if (!subPaths || subPaths.length === 0 || !vectorsArray || vectorsArray.length === 0) {
        return [];
    }
    return polyIntersection(subPaths, vectorsArray);

    // if (subPaths && vectorsArray) {
    //     return polyIntersection(subPaths, vectorsArray);
    // }
    // if (!vectorsArray && subPaths) {
    //     return subPaths;
    // }
    // if (vectorsArray && !subPaths) {
    //     return vectorsArray;
    // }
    // return [];
};

type TMessage = {
    index: string, currentInnerWall: TPolygon[], otherLayers: TPolygon[][], lineWidth: number
}

// const unionPolygons = (polygons: TPolygon[], area?: TPolygon) => {
//     if (polygons.length === 0) {
//         return area;
//     }
//     let polygon = polygons.shift();
//     if (!area) {
//         area = polygon;
//         polygon = polygons.shift();

//         if (polygons.length === 0) {
//             return area;
//         }
//     }
//     const _area = polyUnion(area, [polygon]);
//     return unionPolygons(polygons, _area);
// };

const unionPolygons = (polygons: TPolygon[]): TPolygon => {
    return polygons.reduce((p, c) => {
        p.push(...c);
        return p;
    }, []);
};

const calaClippingSkin = ({ currentInnerWall, otherLayers, lineWidth }: TMessage) => {
    return new Observable((observer) => {
        const commonArea = otherLayers.reduce((p, c) => {
            return intersectionSkin(unionPolygons(c), p);
        }, otherLayers[0] ? unionPolygons(otherLayers[0]) : []);


        let skin;
        let infill;

        if (commonArea.length === 0) {
            skin = currentInnerWall;
            infill = [];
        } else {
            skin = polyDiff(unionPolygons(currentInnerWall), commonArea);
            infill = [commonArea];

            skin = [skin];
        }
        if (skin && skin.length > 0) {
            skin = polyOffset(unionPolygons(skin), -lineWidth);
            skin = [skin];
        }
        observer.next({
            infill,
            skin
        });
        observer.complete();
    });
};

export default calaClippingSkin;