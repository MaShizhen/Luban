import { baseActions as editorBaseActions } from '../editor/actions-base';
import { baseActions as printingBaseActions } from '../printing/actions-base';
/* eslint-disable-next-line import/no-cycle */
import { actions as projectActions } from '../project';
import DrawDelete from './DrawDelete';
import DrawLine from './DrawLine';
import DrawTransform from './DrawTransform';

const updateState = (headType, state) => {
    if (headType === 'printing') {
        return printingBaseActions.updateState(headType, state);
    } else if (headType === 'cnc' || headType === 'laser') {
        return editorBaseActions.updateState(headType, state);
    }
    return null;
};

export const actions = {
    excludeModelById: (headType, id) => (dispatch, getState) => {
        const { excludeModelIDs } = getState()[headType];
        excludeModelIDs[id] = true;
        dispatch(updateState(headType, {
            excludeModelIDs
        }));
    },
    setOperations: (headType, operations) => (dispatch, getState) => {
        const { excludeModelIDs } = getState()[headType];
        for (let i = operations.length() - 1; i > -1; i--) {
            const modelID = operations.getItem(i).state.target.modelID;
            if (modelID in excludeModelIDs) {
                delete excludeModelIDs[modelID];
                operations.removeItem(i);
            }
        }
        if (!operations.isEmpty()) {
            const { history } = getState()[headType];
            history.push(operations);
            dispatch(updateState(headType, {
                history
            }));
        }
        dispatch(projectActions.autoSaveEnvironment(headType));
    },
    clearDrawOperations: (headType) => (dispatch, getState) => {
        const { history } = getState()[headType];
        history.history = history.history.filter((item) => {
            return !item.operations.some(operation => {
                return operation instanceof DrawLine || operation instanceof DrawDelete || operation instanceof DrawTransform;
            });
        });
        history.index = history.history.length - 1;
        dispatch(updateState(headType, {
            history
        }));
    },
    clear: (headType) => (dispatch, getState) => {
        const history = getState()[headType]?.history;
        history.clear();
        dispatch(updateState(headType, {
            history
        }));
    },
    undo: (headType) => (dispatch, getState) => {
        const { history } = getState()[headType];
        history.undo();
        dispatch(projectActions.autoSaveEnvironment(headType));
        dispatch(updateState(headType, {
            history
        }));
    },
    redo: (headType) => (dispatch, getState) => {
        const { history } = getState()[headType];
        history.redo();
        dispatch(projectActions.autoSaveEnvironment(headType));
        dispatch(updateState(headType, {
            history
        }));
    },
    clearTargetTmpState: (headType) => (dispatch, getState) => {
        let { targetTmpState } = getState()[headType];
        targetTmpState = {};
        dispatch(updateState(headType, {
            targetTmpState
        }));
    },
    updateTargetTmpState: (headType, targetId, tmpState) => (dispatch, getState) => {
        const { targetTmpState } = getState()[headType];
        if (!targetTmpState[targetId]) {
            targetTmpState[targetId] = {};
        }
        targetTmpState[targetId] = {
            ...targetTmpState[targetId],
            ...tmpState
        };
        dispatch(updateState(headType, {
            targetTmpState
        }));
    }
};
