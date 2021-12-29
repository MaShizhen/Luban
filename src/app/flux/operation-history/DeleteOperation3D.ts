import * as THREE from 'three';
import type ModelGroup from '../../models/ModelGroup';
import ThreeGroup from '../../models/ThreeGroup';
import ThreeUtils from '../../three-extensions/ThreeUtils';
import Operation from './Operation';
import ThreeModel from '../../models/ThreeModel';

type DeleteOperationProp = {
    target: ThreeGroup | ThreeModel,
};

type DeleteOperationState = {
    target: ThreeGroup | ThreeModel,
    modelGroup: ModelGroup
    transformation: {
        position: THREE.Vector3,
        scale: THREE.Vector3,
        rotation: THREE.Euler
    }
};

export default class DeleteOperation3D extends Operation<DeleteOperationState> {
    constructor(props: DeleteOperationProp) {
        super();

        // an object to be deleted will be selected at first, unwrapped from parent group
        const model = props.target;
        if (model.isSelected) {
            ThreeUtils.removeObjectParent(model.meshObject);
            if (model instanceof ThreeModel && model.supportTag) {
                ThreeUtils.setObjectParent(model.meshObject, model.target.meshObject);
            } else {
                if (model.parent) {
                    ThreeUtils.setObjectParent(model.meshObject, model.parent.meshObject);
                } else {
                    ThreeUtils.setObjectParent(model.meshObject, props.target.modelGroup.object);
                }
            }
        }

        this.state = {
            target: props.target,
            modelGroup: props.target.modelGroup,
            transformation: {
                position: model.meshObject.position.clone(),
                scale: model.meshObject.scale.clone(),
                rotation: model.meshObject.rotation.clone()
            }
        };
    }

    public redo() {
        const model = this.state.target;
        const modelGroup = this.state.modelGroup;

        if (model.isSelected) {
            ThreeUtils.removeObjectParent(model.meshObject);
            if (model instanceof ThreeModel && model.supportTag) {
                ThreeUtils.setObjectParent(model.meshObject, model.target.meshObject);
            } else {
                if (model.parent) {
                    ThreeUtils.setObjectParent(model.meshObject, model.parent.meshObject);
                } else {
                    ThreeUtils.setObjectParent(model.meshObject, modelGroup.object);
                }
            }
        }
        modelGroup.removeModel(model);
        if (model.isSelected) {
            model.setSelected(false);
            // trigger <VisualizerLeftBar> popup component hidden
            modelGroup.unselectAllModels();
        }
        modelGroup.modelChanged();
    }

    public undo() {
        const model = this.state.target;
        const modelGroup = this.state.modelGroup;

        if (model instanceof ThreeModel && model.supportTag) {
            if (!model.target) return;
            modelGroup.models = modelGroup.models.concat(model);
            model.target.meshObject.add(model.meshObject); // restore the parent-child relationship
        } else if (!model.parent) {
            modelGroup.models = modelGroup.models.concat(model);
            modelGroup.object.add(model.meshObject);
        } else if (model.parent && model.parent instanceof ThreeGroup) {
            if (modelGroup.models.find(m => m.modelID === model.parent.modelID)) {
                modelGroup.recoveryGroup(model.parent, model);
            } else {
                modelGroup.models = modelGroup.models.concat(model.parent);
                ThreeUtils.setObjectParent(model.meshObject, model.parent.meshObject);
                ThreeUtils.setObjectParent(model.parent.meshObject, modelGroup.object);

                model.meshObject.position.copy(this.state.transformation.position);
                model.meshObject.scale.copy(this.state.transformation.scale);
                model.meshObject.rotation.copy(this.state.transformation.rotation);
            }
        }
        if (model.isSelected) {
            model.setSelected(false);
        }
        modelGroup.stickToPlateAndCheckOverstepped(model);

        model.meshObject.addEventListener('update', modelGroup.onModelUpdate);
        modelGroup.modelChanged();
    }
}
