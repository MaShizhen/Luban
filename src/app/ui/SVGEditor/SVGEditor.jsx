import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import PropTypes from 'prop-types';


import { shortcutActions, priorities, ShortcutManager } from '../../lib/shortcut';
import styles from './index.styl';
import { SVG_EVENT_CONTEXTMENU, SVG_EVENT_MODE } from './constants';
import SVGCanvas from './SVGCanvas';
import SVGLeftBar from './SVGLeftBar';

const SVGEditor = forwardRef((props, ref) => {
    const canvas = useRef(null);
    const leftBarRef = useRef(null);

    const [mode, setMode] = useState('select');
    const [selectEditing, setSelectEditing] = useState(false);
    const selectEditingRef = useRef(selectEditing);
    selectEditingRef.current = selectEditing;

    const shortcutHandler = {
        title: 'SVGEditor',
        // TODO: unregister in case of component is destroyed
        isActive: () => props.isActive,
        priority: priorities.VIEW,
        shortcuts: {
            [shortcutActions.UNDO]: () => {
                if (!(props.menuDisabledCount > 0)) {
                    props.editorActions.undo();
                }
            },
            [shortcutActions.REDO]: () => {
                if (!(props.menuDisabledCount > 0)) {
                    props.editorActions.redo();
                }
            },
            [shortcutActions.SELECTALL]: () => {
                if (!(props.menuDisabledCount > 0)) {
                    props.editorActions.selectAll();
                }
            },
            [shortcutActions.UNSELECT]: () => {
                if (!(props.menuDisabledCount > 0)) {
                    props.editorActions.unselectAll();
                }
            },
            [shortcutActions.DELETE]: () => {
                if (!(props.menuDisabledCount > 0)) {
                    props.editorActions.deleteSelectedModel(selectEditingRef.current ? 'draw' : mode);
                }
            },
            [shortcutActions.COPY]: () => {
                if (!(props.menuDisabledCount > 0)) {
                    props.editorActions.copy();
                }
            },
            [shortcutActions.PASTE]: () => {
                if (!(props.menuDisabledCount > 0)) {
                    props.editorActions.paste();
                }
            },
            [shortcutActions.DUPLICATE]: () => {
                if (!(props.menuDisabledCount > 0)) {
                    props.editorActions.duplicateSelectedModel();
                }
            },
            [shortcutActions.CUT]: () => {
                if (!(props.menuDisabledCount > 0)) {
                    props.editorActions.cut();
                }
            },
            // optimize: accelerate when continuous click
            'MOVE-UP': {
                keys: ['up'],
                callback: () => {
                    props.elementActions.moveElementsStart(props.SVGActions.getSelectedElements());
                    props.elementActions.moveElements(props.SVGActions.getSelectedElements(), { dx: 0, dy: -1 });
                },
                keyupCallback: () => {
                    props.elementActions.moveElementsFinish(props.SVGActions.getSelectedElements());
                }
            },
            'MOVE-DOWM': {
                keys: ['down'],
                callback: () => {
                    props.elementActions.moveElementsStart(props.SVGActions.getSelectedElements());
                    props.elementActions.moveElements(props.SVGActions.getSelectedElements(), { dx: 0, dy: 1 });
                },
                keyupCallback: () => {
                    props.elementActions.moveElementsFinish(props.SVGActions.getSelectedElements());
                }
            },
            'MOVE-LEFT': {
                keys: ['left'],
                callback: () => {
                    props.elementActions.moveElementsStart(props.SVGActions.getSelectedElements());
                    props.elementActions.moveElements(props.SVGActions.getSelectedElements(), { dx: -1, dy: 0 });
                },
                keyupCallback: () => {
                    props.elementActions.moveElementsFinish(props.SVGActions.getSelectedElements());
                }
            },
            'MOVE-RIGHT': {
                keys: ['right'],
                callback: () => {
                    props.elementActions.moveElementsStart(props.SVGActions.getSelectedElements());
                    props.elementActions.moveElements(props.SVGActions.getSelectedElements(), { dx: 1, dy: 0 });
                },
                keyupCallback: () => {
                    props.elementActions.moveElementsFinish(props.SVGActions.getSelectedElements());
                }
            }

        }
    };


    useEffect(() => {
        ShortcutManager.register(shortcutHandler);
    }, []);

    useEffect(() => {
        canvas.current.on(SVG_EVENT_MODE, (_mode) => {
            setMode(_mode);
        });

        canvas.current.on(SVG_EVENT_CONTEXTMENU, (event) => {
            props.showContextMenu(event);
        });

        // Init, Setup SVGContentGroup
        props.initContentGroup(canvas.current.svgContentGroup);
    }, []);

    const changeCanvasMode = (_mode, ext) => {
        canvas.current.setMode(_mode, ext);
    };

    const insertDefaultTextVector = async () => {
        const element = await props.createText('Snapmaker');
        props.onCreateElement(element);

        // todo, select text after create
        // canvas.current.selectOnly([elem]);
        changeCanvasMode('select');
    };



    const hideLeftBarOverlay = () => {
        leftBarRef.current.actions.hideLeftBarOverlay();
    };

    const zoomIn = () => {
        canvas.current.zoomIn();
    };

    const zoomOut = () => {
        canvas.current.zoomOut();
    };

    const autoFocus = () => {
        canvas.current.autoFocus();
    };

    useImperativeHandle(ref, () => ({
        zoomIn, zoomOut, autoFocus
    }));

    const onStartDraw = () => {
        canvas.current.startDraw();
    };

    const onStopDraw = (exitCompletely) => {
        setSelectEditing(false);
        canvas.current.stopDraw(exitCompletely);
    };

    const onDrawTransformStart = (elem) => {
        setSelectEditing(!!elem);
    };

    const onDrawTransformComplete = (...args) => {
        setSelectEditing(false);
        props.editorActions.onDrawTransformComplete(...args);
    };

    return (
        <React.Fragment>
            <div className={styles['laser-table']} style={{ position: 'relative' }}>
                <div className={styles['laser-table-row']}>
                    <div className={styles['view-space']}>
                        <SVGCanvas
                            className={styles['svg-content']}
                            editable={props.editable}
                            SVGActions={props.SVGActions}
                            size={props.size}
                            materials={props.materials}
                            scale={props.scale}
                            minScale={props.minScale}
                            maxScale={props.maxScale}
                            target={props.target}
                            updateScale={props.updateScale}
                            updateTarget={props.updateTarget}
                            coordinateMode={props.coordinateMode}
                            coordinateSize={props.coordinateSize}
                            ref={canvas}
                            onCreateElement={props.onCreateElement}
                            onSelectElements={props.onSelectElements}
                            onClearSelection={props.onClearSelection}
                            onMoveSelectedElementsByKey={props.onMoveSelectedElementsByKey}
                            updateTextTransformationAfterEdit={props.updateTextTransformationAfterEdit}
                            getSelectedElementsUniformScalingState={props.getSelectedElementsUniformScalingState}
                            elementActions={props.elementActions}
                            hideLeftBarOverlay={hideLeftBarOverlay}
                            onDrawLine={props.editorActions.onDrawLine}
                            onDrawDelete={props.editorActions.onDrawDelete}
                            onDrawTransform={props.editorActions.onDrawTransform}
                            onDrawTransformStart={(elem) => onDrawTransformStart(elem)}
                            onDrawTransformComplete={(...args) => onDrawTransformComplete(...args)}
                            onDrawStart={props.editorActions.onDrawStart}
                            onDrawComplete={props.editorActions.onDrawComplete}
                            onBoxSelect={props.editorActions.onBoxSelect}
                        />
                    </div>
                    <SVGLeftBar
                        ref={leftBarRef}
                        mode={mode}
                        selectEditing={selectEditing}
                        insertDefaultTextVector={insertDefaultTextVector}
                        setMode={changeCanvasMode}
                        onChangeFile={props.onChangeFile}
                        onClickToUpload={props.onClickToUpload}
                        fileInput={props.fileInput}
                        allowedFiles={props.allowedFiles}
                        editable={props.editable}
                        headType={props.headType}
                        onStartDraw={() => onStartDraw()}
                        onStopDraw={(exitCompletely) => onStopDraw(exitCompletely)}
                    />
                </div>
            </div>
        </React.Fragment>
    );
});

SVGEditor.propTypes = {
    isActive: PropTypes.bool,
    size: PropTypes.object.isRequired,
    materials: PropTypes.object.isRequired,
    SVGActions: PropTypes.object.isRequired,
    scale: PropTypes.number.isRequired,
    minScale: PropTypes.number,
    maxScale: PropTypes.number,
    target: PropTypes.object,
    coordinateMode: PropTypes.object.isRequired,
    coordinateSize: PropTypes.object.isRequired,
    editable: PropTypes.bool,
    menuDisabledCount: PropTypes.number,

    updateScale: PropTypes.func.isRequired,
    updateTarget: PropTypes.func.isRequired,

    initContentGroup: PropTypes.func.isRequired,
    showContextMenu: PropTypes.func,

    // insertDefaultTextVector: PropTypes.func.isRequired

    // editor actions
    onCreateElement: PropTypes.func.isRequired,
    onSelectElements: PropTypes.func.isRequired,
    onClearSelection: PropTypes.func.isRequired,
    onMoveSelectedElementsByKey: PropTypes.func.isRequired,
    updateTextTransformationAfterEdit: PropTypes.func.isRequired,
    getSelectedElementsUniformScalingState: PropTypes.func.isRequired,

    elementActions: PropTypes.shape({
        moveElementsStart: PropTypes.func.isRequired,
        moveElements: PropTypes.func.isRequired,
        moveElementsFinish: PropTypes.func.isRequired,
        resizeElementsStart: PropTypes.func.isRequired,
        resizeElements: PropTypes.func.isRequired,
        resizeElementsFinish: PropTypes.func.isRequired,
        rotateElementsStart: PropTypes.func.isRequired,
        rotateElements: PropTypes.func.isRequired,
        rotateElementsFinish: PropTypes.func.isRequired,
        moveElementsOnKeyDown: PropTypes.func.isRequired
    }).isRequired,
    editorActions: PropTypes.object.isRequired,

    createText: PropTypes.func.isRequired,

    onChangeFile: PropTypes.func.isRequired,
    onClickToUpload: PropTypes.func.isRequired,
    fileInput: PropTypes.object.isRequired,
    allowedFiles: PropTypes.string.isRequired,
    headType: PropTypes.string
};

export default SVGEditor;
