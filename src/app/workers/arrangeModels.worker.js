import { Observable } from 'observable-fns';
import { expose } from 'threads/worker';
import { nesting } from '../../shared/lib/nesting';

const arrangeModels = async (data) => {
    return new Observable((resolve) => {
        try {
            const {
                stls = [],
                validArea, angle, offset, padding
            } = data;

            const x = validArea.max.x - validArea.min.x - padding * 2 + offset;
            const y = validArea.max.y - validArea.min.y - padding * 2 + offset;
            const parts = nesting(stls, {
                size: {
                    x: x < 0 ? 0 : x,
                    y: y < 0 ? 0 : y
                },
                angle,
                offset
            }, (progress) => {
                resolve.next({ status: 'progress', value: { progress } });
            });
            resolve.complete({ status: 'succeed', value: { parts } });
        } catch (err) {
            resolve.error({ status: 'err', value: err });
        }
    });
};

expose(arrangeModels);
