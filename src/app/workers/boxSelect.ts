import { getOverlapSize, isInside } from 'overlap-area';
// import { polyDiff } from '../../server/lib/clipper/cLipper-adapter';
import sendMessage from './utils/sendMessage';

const boxSelect = (bbox, modelsBbox, onlyContainSelect) => {
    // const _isEqual = (a, b) => {
    //     const aMin = { x: a[0][0], y: a[0][1] };
    //     const aMax = { x: 0, y: 0 };

    //     const bMin = { x: b[0][0], y: b[0][1] };
    //     const bMax = { x: 0, y: 0 };

    //     a.forEach(p => {
    //         aMin.x = Math.min(aMin.x, p[0]);
    //         aMin.y = Math.min(aMin.y, p[1]);
    //         aMax.x = Math.max(aMax.x, p[0]);
    //         aMax.y = Math.max(aMax.y, p[1]);
    //     });
    //     b.forEach(p => {
    //         bMin.x = Math.min(bMin.x, p[0]);
    //         bMin.y = Math.min(bMin.y, p[1]);
    //         bMax.x = Math.max(bMax.x, p[0]);
    //         bMax.y = Math.max(bMax.y, p[1]);
    //     });
    //     console.log('aMin =', aMin);
    //     console.log('aMax =', aMax);
    //     console.log('bMin =', bMin);
    //     console.log('bMax =', bMax);
    //     return aMin.x === bMin.x && aMin.y === bMin.y && aMax.x === bMax.x && aMax.y === bMax.y;
    // };

    const selectBoxPoints = [
        [bbox.x + bbox.width, bbox.y + bbox.height],
        [bbox.x, bbox.y + bbox.height],
        [bbox.x, bbox.y],
        [bbox.x + bbox.width, bbox.y]
        // [bbox.x + bbox.width, bbox.y + bbox.height]
    ];
    // const selectString = `${bbox.x}${bbox.y}${bbox.x + bbox.width}${bbox.y + bbox.height}`;
    // console.log('bbox: ', `(${bbox.x}, ${bbox.y}), (${bbox.x + bbox.width}), ${bbox.y + bbox.height}`);

    const selectedIndex = [];
    modelsBbox.forEach(({ x, y, width, height }, index) => {
        if (width === 0) { width = 1; }
        if (height === 0) { height = 1; }
        // console.log('index: ', `${index} : (${x}, ${y}), (${x + width}), ${y + height}`);
        const modelBoxPoints = [
            [x + width, y + height],
            [x, y + height],
            [x, y],
            [x + width, y]
            // [x + width, y + height]
        ];
        // const res = polyDiff(selectBoxPoints, modelBoxPoints);
        // if (res.length === 1) {
        //     const ret = _isEqual(res[0], selectBoxPoints[0]);
        //     if (!ret) {
        //         selectedIndex.push(index);
        //     }
        // } else {
        //     selectedIndex.push(index);
        // }
        const overlapSize = getOverlapSize(selectBoxPoints, modelBoxPoints);
        if (overlapSize) {
            if (onlyContainSelect) {
                const res = modelBoxPoints.every(point => {
                    return isInside(point, selectBoxPoints);
                });
                if (!res) {
                    return;
                }
            }
            selectedIndex.push(index);
        }
    });

    sendMessage(selectedIndex);
};

export default boxSelect;
