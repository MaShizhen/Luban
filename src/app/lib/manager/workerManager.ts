import workerpool, { WorkerPool } from 'workerpool';
import './Pool.worker';
import { spawn, Worker, Pool } from 'threads';

export enum WorkerMethods {
    // LUBAN worker methods BEGIN
    arrangeModels = 'arrangeModels',
    computeModelFaces = 'computeModelFaces',
    evaluateSupportArea = 'evaluateSupportArea',
    gcodeToArraybufferGeometry = 'gcodeToArraybufferGeometry',
    gcodeToBufferGeometry = 'gcodeToBufferGeometry',
    heartBeat = 'heartBeat',
    loadModel = 'loadModel',
    loadModel2 = 'loadModel2',
    toolpathRenderer = 'toolpathRenderer'
    // LUBAN worker methods END
}

type IWorkerManager = {
    [method in WorkerMethods]: (data: unknown[], onmessage: (data: unknown) => void) => {
        terminate(): void;
    };
}

class WorkerManager {
    public pool: WorkerPool
}

Object.entries(WorkerMethods).forEach(([, method]) => {
    // eslint-disable-next-line func-names
    WorkerManager.prototype[method] = function (data: any, onmessage?: (payload: unknown) => void) {
        const pool = (
            this.pool || (
                this.pool = workerpool.pool('./Pool.worker.js', {
                    minWorkers: 'max',
                    workerType: 'web'
                })
            )
        ) as WorkerPool;

        const handle = pool.exec(method, data, {
            on: (payload) => {
                if (onmessage) {
                    onmessage(payload);
                } else {
                    WorkerManager.prototype[method].onmessage(payload);
                }
            },
        });
        return {
            terminate: () => {
                handle.cancel();
            }
        };
    };
});

const manager = new WorkerManager() as unknown as IWorkerManager;

export default manager;

export const arrangeModels = async ({ models, validArea, angle, offset, padding }, callback) => {
    const pool = Pool(() => spawn(new Worker('./computeModelFaces.worker.js')), models.length);

    const ps = models.map(async (model) => {
        return new Promise((resolve) => {
            // const fun = await spawn(new Worker('./computeModelFaces.worker.js'));
            // const res = await fun(model);
            // return res;
            pool.queue(async fun => {
                const ret = await fun(model);
                resolve(ret);
            });
        });
    });
    const stls = await Promise.all(ps);
    // await pool.completed();
    // await pool.terminate();

    const arrangeModelsTask = await spawn(new Worker('./arrangeModels.worker.js'));

    // @ts-ignore TODO
    const ret = await arrangeModelsTask({ stls: stls, validArea, angle, offset, padding }).subscribe(message => {
        console.log(message);

        callback(message);
    });

    return ret;
};
