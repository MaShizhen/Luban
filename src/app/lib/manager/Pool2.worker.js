import workerpool from 'workerpool';
import { expose } from 'threads/worker';
// import { setCallBack } from '../../workers/utils/sendMessage';

const methods = require.context('../../workers', false, /\.(t|j)s/).keys()
    .reduce((prev, key) => {
        key = key.replace('./', '');
        const [name] = key.split('.');
        // eslint-disable-next-line import/no-dynamic-require
        prev[name] = require(`../../workers/${key}`).default;
        return prev;
    }, {});

workerpool.worker(methods);

const pool = (workerName, data) => {
    // eslint-disable-next-line no-debugger
    // debugger;
    // setCallBack(observer);
    return methods[workerName](data);
};

expose(pool);
