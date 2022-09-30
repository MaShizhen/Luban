import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import i18n from '../../../../lib/i18n';
import CalibrationPreview, { CUTOUT_MODE } from './ManualCalibration';
// import Anchor from '../../../components/Anchor';
import Modal from '../../../components/Modal';
import { Button } from '../../../components/Buttons';
import styles from '../styles.styl';

const PickObject = (props) => {
    const [hasFinish, setHasFinish] = useState(false);
    const calibrationPreview = useRef(null);
    useEffect(() => {
        if (calibrationPreview.current) {
            calibrationPreview.current.onChangeImage(props.fileName, props.size.x, props.size.y);
        }
        return () => {
            props.resetPanel();
        };
    }, [calibrationPreview]);

    const actions = {
        onClickToConfirm: async () => {
            setHasFinish(true);
            const outputUri = await calibrationPreview.current.exportPreviewImage();
            props.resetPanel();
            props.onClipImage(outputUri);
        },
        previousPanel: () => {
            props.resetPanel();
        },
        setCameraCalibrationMatrix: async () => {
            // 最后一步
            props.onClipImage();
        }
    };

    return (
        <React.Fragment>
            <Modal onClose={actions.previousPanel}>
                <div className="clearfix" />
                <Modal.Header>
                    <div className={styles['laser-set-background-calibration-title']}>
                        {i18n._('key-Laser/CameraCapture-Calibrate')}
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <div className={styles['laser-set-background-modal-content']}>
                        <div className={styles['calibrate-background']}>
                            <div className={styles['calibrate-advise']}>
                                <p style={{ marginBottom: '1rem', textAlign: 'left', width: '522px' }}>
                                    工件轮廓匹配
                                </p>
                            </div>

                        </div>
                        <CalibrationPreview
                            ref={calibrationPreview}
                            getPoints={[]}
                            width={props.size.x}
                            height={props.size.y}
                            mode={CUTOUT_MODE}
                            materialThickness={props.materialThickness}
                            series={props.series}
                            size={props.size}
                            toolHead={props.toolHead}
                            updateAffinePoints={() => {

                            }}
                        />

                        <div className={classNames(
                            'sm-flex',
                            'justify-space-between',
                            'margin-vertical-16',
                        )}
                        >
                            <Button
                                width="160px"
                                priority="level-three"
                                type="default"
                                onClick={() => actions.onClickToUpload(true)}
                            >
                                {i18n._('key-Laser/CameraCapture-Reset')}
                            </Button>
                            <Button
                                width="160px"
                                priority="level-three"
                                type="default"
                                onClick={actions.onClickToConfirm}
                            >
                                {i18n._('key-Laser/CameraCapture-Confirm')}
                            </Button>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <div style={{ minHeight: 30 }}>
                        <Button
                            width="96px"
                            priority="level-two"
                            type="default"
                            className={classNames(
                                styles['btn-camera'],
                                'float-l'
                            )}
                            onClick={actions.previousPanel}
                        >
                            {i18n._('key-Laser/CameraCapture-Back')}
                        </Button>
                        {hasFinish && (
                            <Button
                                priority="level-two"
                                width="96px"
                                className={classNames(
                                    // styles[state.isComfirmPoints ? 'btn-right-camera' : 'btn-right-camera-disabled border-radius-8'],
                                )}
                                onClick={actions.setCameraCalibrationMatrix}
                            >
                                {i18n._('key-Laser/CameraCapture-Apply')}
                            </Button>
                        )}
                    </div>
                </Modal.Footer>
            </Modal>
        </React.Fragment>
    );
};
PickObject.propTypes = {
    materialThickness: PropTypes.number.isRequired,
    fileName: PropTypes.string.isRequired,
    resetPanel: PropTypes.func.isRequired,
    onClipImage: PropTypes.func.isRequired,
    series: PropTypes.string.isRequired,
    size: PropTypes.object.isRequired,
    toolHead: PropTypes.object.isRequired
};

export default PickObject;
