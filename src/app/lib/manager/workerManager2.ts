// import workerpool, { WorkerPool } from 'workerpool';
import './Pool.worker';
import { spawn, Pool, Worker } from 'threads';

export enum WorkerMethods {
    // LUBAN worker methods BEGIN
    arrangeModels = 'arrangeModels',
    computeModelFaces = 'computeModelFaces',
    evaluateSupportArea = 'evaluateSupportArea',
    gcodeToArraybufferGeometry = 'gcodeToArraybufferGeometry',
    gcodeToBufferGeometry = 'gcodeToBufferGeometry',
    heartBeat = 'heartBeat',
    loadModel = 'loadModel',
    toolpathRenderer = 'toolpathRenderer'
    // LUBAN worker methods END
}

type IWorkerManager = {
    [method in WorkerMethods]: (data: unknown[], onmessage: (data: unknown) => void) => {
        terminate(): void;
    };
}

// this.pool = workerpool.pool('./Pool.worker.js', {
//     minWorkers: 'max',
//     workerType: 'web'
// })

// const handle = pool.exec(method, data, {
//     on: (payload) => {
//         if (onmessage) {
//             onmessage(payload);
//         } else {
//             WorkerManager.prototype[method].onmessage(payload);
//         }
//     },
// });
class WorkerManager {
    public pool: any
}

Object.entries(WorkerMethods).forEach(([, method]) => {
    // eslint-disable-next-line func-names
    WorkerManager.prototype[method] = function (data: any, onmessage?: (payload: unknown) => void) {
        const pool = (
            this.pool || (
                this.pool = Pool(() => spawn(new Worker('./Pool.worker.js')), 8 /* optional size */)
            )
        );
        const task = pool.queue(async runner => {
            const res = await runner(method, data);
            onmessage(res);
        });
        return {
            terminate: () => {
                task.cancel();
            }
        };
    };
});

const manager = new WorkerManager() as unknown as IWorkerManager;

export default manager;

