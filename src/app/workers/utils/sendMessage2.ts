// import workerpool from 'workerpool';
let callback = null;

export const setCallBack = (fun) => {
    // eslint-disable-next-line no-debugger
    debugger;
    callback = fun;
};

const sendMessage = (message: unknown) => {
    if (callback) {
        console.log(message);
        // workerpool.workerEmit(message);
        callback(message);
    } else {
        // eslint-disable-next-line no-debugger
        debugger;
    }
};

export default sendMessage;

