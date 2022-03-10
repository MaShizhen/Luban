import type DrawGroup from '../../ui/SVGEditor/svg-content/DrawGroup';
import { TransformRecord } from '../../ui/SVGEditor/svg-content/DrawGroup/DrawGroup';
import Operation from './Operation';

type DrawTransformProp = {
    before: TransformRecord[],
    after: TransformRecord[],
    drawGroup: DrawGroup,
}

export default class DrawTransform extends Operation<DrawTransformProp> {
    constructor(props: DrawTransformProp) {
        super();
        this.state = {
            before: props.before,
            after: props.after,
            drawGroup: props.drawGroup
        };
    }

    public redo() {
        this.state.after.forEach(record => {
            record.line.updatePosition(record.points);
            record.line.updatePosition();
        });
        this.state.drawGroup.clearOperations();
    }

    public undo() {
        this.state.before.forEach(record => {
            record.line.updatePosition(record.points);
            record.line.updatePosition();
        });
        this.state.drawGroup.clearOperations();
    }
}
